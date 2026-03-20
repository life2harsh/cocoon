from fastapi import FastAPI, HTTPException, Depends, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import sqlite3
import uuid
import os
from datetime import datetime, timedelta
from contextlib import contextmanager
import secrets
import hashlib
import json

load_dotenv()

app = FastAPI(title="Cocoon Journal API")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "https://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.environ.get("DATABASE_PATH") or os.path.join(BASE_DIR, "cocoon.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

def get_google_client_id():
    return os.environ.get("GOOGLE_CLIENT_ID", "")

def get_google_client_secret():
    return os.environ.get("GOOGLE_CLIENT_SECRET", "")

def get_google_redirect_uri():
    return os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                display_name TEXT,
                avatar_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS journals (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                owner_id TEXT NOT NULL,
                archived_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                template_type TEXT DEFAULT 'free_write',
                ai_prompts_enabled INTEGER DEFAULT 1,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS journal_members (
                id TEXT PRIMARY KEY,
                journal_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT DEFAULT 'member',
                joined_at TEXT NOT NULL,
                FOREIGN KEY (journal_id) REFERENCES journals(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(journal_id, user_id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                journal_id TEXT NOT NULL,
                author_id TEXT NOT NULL,
                body TEXT,
                encrypted_body TEXT,
                nonce TEXT,
                prompt_id TEXT,
                created_at TEXT NOT NULL,
                edited_at TEXT,
                FOREIGN KEY (journal_id) REFERENCES journals(id),
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invites (
                id TEXT PRIMARY KEY,
                journal_id TEXT NOT NULL,
                code TEXT UNIQUE NOT NULL,
                created_by TEXT NOT NULL,
                used_by TEXT,
                used_at TEXT,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (journal_id) REFERENCES journals(id),
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_questions (
                id TEXT PRIMARY KEY,
                date TEXT UNIQUE NOT NULL,
                prompt TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_streaks (
                user_id TEXT PRIMARY KEY,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_entry_date TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        conn.commit()

init_db()

print(f"Database initialized at: {DATABASE_PATH}")

class UserOut(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]

class JournalOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    archived_at: Optional[str]
    created_at: str
    template_type: str

class EntryOut(BaseModel):
    id: str
    journal_id: str
    author_id: str
    body: Optional[str]
    encrypted_body: Optional[str]
    nonce: Optional[str]
    prompt_id: Optional[str]
    created_at: str
    edited_at: Optional[str]

class InviteOut(BaseModel):
    id: str
    journal_id: str
    code: str
    expires_at: str

async def get_current_user(request: Request) -> UserOut:
    token = request.cookies.get("token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (token,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        if datetime.fromisoformat(session["expires_at"]) < datetime.now():
            cursor.execute("DELETE FROM sessions WHERE id = ?", (token,))
            conn.commit()
            raise HTTPException(status_code=401, detail="Session expired")
        
        cursor.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return UserOut(
            id=user["id"],
            email=user["email"],
            display_name=user["display_name"],
            avatar_url=user["avatar_url"]
        )

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/auth/google")
def google_login():
    google_client_id = get_google_client_id()
    google_redirect_uri = get_google_redirect_uri()
    
    if not google_client_id:
        raise HTTPException(status_code=400, detail="Google OAuth not configured on server")
    
    state = secrets.token_urlsafe(32)
    
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={google_client_id}&"
        f"redirect_uri={google_redirect_uri}&"
        f"response_type=code&"
        f"scope=openid email profile&"
        f"state={state}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    
    return {"auth_url": auth_url, "state": state}

class AuthCallbackRequest(BaseModel):
    code: str
    state: str = ""

@app.post("/api/auth/callback")
def google_callback(request: AuthCallbackRequest, response: Response):
    import httpx
    
    code = request.code
    
    google_client_id = get_google_client_id()
    google_client_secret = get_google_client_secret()
    google_redirect_uri = get_google_redirect_uri()
    
    if not google_client_id or not google_client_secret:
        raise HTTPException(status_code=400, detail="Google OAuth not configured on server")
    
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": google_redirect_uri,
    }
    
    try:
        token_http_response = httpx.post(token_url, data=token_data, timeout=10.0)
        token_response = token_http_response.json()
        
        if "access_token" not in token_response:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        access_token = token_response["access_token"]
        
        userinfo_response = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0
        )
        userinfo = userinfo_response.json()
        
    except httpx.HTTPError:
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")
    
    email = userinfo.get("email")
    display_name = userinfo.get("name")
    avatar_url = userinfo.get("picture")
    google_id = userinfo.get("id")
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        now = datetime.now().isoformat()
        
        if not user:
            user_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, email, display_name, avatar_url, now, now)
            )
            cursor.execute(
                "INSERT INTO user_streaks (user_id, current_streak, longest_streak, updated_at) VALUES (?, 0, 0, ?)",
                (user_id, now)
            )
        else:
            user_id = user["id"]
            cursor.execute(
                "UPDATE users SET display_name = ?, avatar_url = ?, updated_at = ? WHERE id = ?",
                (display_name, avatar_url, now, user_id)
            )
        
        session_id = secrets.token_urlsafe(32)
        expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        cursor.execute(
            "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (session_id, user_id, now, expires_at)
        )
        
        conn.commit()
    
    response.set_cookie(
        key="token",
        value=session_id,
        httponly=True,
        samesite="lax",
        max_age=60*60*24*30,
        secure=False,
    )
    
    return {
        "access_token": session_id,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": email,
            "display_name": display_name,
            "avatar_url": avatar_url
        }
    }

@app.post("/api/auth/signout")
def signout(token: str = Depends(oauth2_scheme)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = ?", (token,))
        conn.commit()
    return {"message": "Signed out"}

@app.get("/api/me")
def get_me(user: UserOut = Depends(get_current_user)):
    return user

@app.get("/api/journals")
def get_journals(user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT j.* FROM journals j
            JOIN journal_members jm ON j.id = jm.journal_id
            WHERE jm.user_id = ?
            ORDER BY j.created_at DESC
        """, (user.id,))
        journals = cursor.fetchall()
        
        return [
            {
                "id": j["id"],
                "name": j["name"],
                "description": j["description"],
                "owner_id": j["owner_id"],
                "archived_at": j["archived_at"],
                "created_at": j["created_at"],
                "template_type": j["template_type"]
            }
            for j in journals
        ]

@app.post("/api/journals")
def create_journal(data: dict, user: UserOut = Depends(get_current_user)):
    template_type = data.get("template_type", "free_write")
    valid_templates = ["free_write", "structured", "gratitude", "cbt", "reflection", "habit", "couple"]
    if template_type not in valid_templates:
        template_type = "free_write"
    
    name = data.get("name", "Untitled notebook")
    if template_type == "couple":
        name = "Our Journal"
    
    journal_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO journals (id, name, owner_id, template_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (journal_id, name, user.id, template_type, now, now)
        )
        
        member_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO journal_members (id, journal_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)",
            (member_id, journal_id, user.id, "owner", now)
        )
        
        conn.commit()
    
    return {
        "id": journal_id,
        "name": name,
        "owner_id": user.id,
        "template_type": template_type,
        "created_at": now
    }

@app.get("/api/journals/{journal_id}")
def get_journal(journal_id: str, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ?
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Journal not found")
        
        cursor.execute("SELECT * FROM journals WHERE id = ?", (journal_id,))
        journal = cursor.fetchone()
        
        cursor.execute("""
            SELECT jm.user_id, jm.role, u.display_name 
            FROM journal_members jm 
            JOIN users u ON jm.user_id = u.id 
            WHERE jm.journal_id = ?
        """, (journal_id,))
        members = cursor.fetchall()
        
        cursor.execute("""
            SELECT * FROM entries WHERE journal_id = ? ORDER BY created_at DESC
        """, (journal_id,))
        entries = cursor.fetchall()
        
        cursor.execute("SELECT * FROM journals WHERE id = ?", (journal_id,))
        journal = cursor.fetchone()
        
    return {
        "journal": {
            "id": journal["id"],
            "name": journal["name"],
            "description": journal["description"],
            "owner_id": journal["owner_id"],
            "archived_at": journal["archived_at"],
            "created_at": journal["created_at"],
            "role": membership["role"]
        },
        "members": [
            {
                "user_id": m["user_id"],
                "role": m["role"],
                "display_name": m["display_name"]
            }
            for m in members
        ],
        "entries": [
            {
                "id": e["id"],
                "journal_id": e["journal_id"],
                "author_id": e["author_id"],
                "body": e["body"],
                "encrypted_body": e["encrypted_body"],
                "nonce": e["nonce"],
                "prompt_id": e["prompt_id"],
                "created_at": e["created_at"],
                "edited_at": e["edited_at"]
            }
            for e in entries
        ]
    }

@app.patch("/api/journals/{journal_id}")
def update_journal(journal_id: str, data: dict, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ? AND role = 'owner'
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        now = datetime.now().isoformat()
        name = data.get("name")
        description = data.get("description")
        archived = data.get("archived")
        
        if name is not None:
            cursor.execute("UPDATE journals SET name = ?, updated_at = ? WHERE id = ?", (name, now, journal_id))
        
        if description is not None:
            cursor.execute("UPDATE journals SET description = ?, updated_at = ? WHERE id = ?", (description, now, journal_id))
        
        if archived is not None:
            if archived:
                cursor.execute("UPDATE journals SET archived_at = ?, updated_at = ? WHERE id = ?", (now, now, journal_id))
            else:
                cursor.execute("UPDATE journals SET archived_at = NULL, updated_at = ? WHERE id = ?", (now, journal_id))
        
        conn.commit()
    
    return {"message": "Updated"}

@app.delete("/api/journals/{journal_id}")
def delete_journal(journal_id: str, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ? AND role = 'owner'
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        cursor.execute("DELETE FROM entries WHERE journal_id = ?", (journal_id,))
        cursor.execute("DELETE FROM invites WHERE journal_id = ?", (journal_id,))
        cursor.execute("DELETE FROM journal_members WHERE journal_id = ?", (journal_id,))
        cursor.execute("DELETE FROM journals WHERE id = ?", (journal_id,))
        
        conn.commit()
    
    return {"message": "Deleted"}

@app.get("/api/journals/{journal_id}/settings")
def get_journal_settings(journal_id: str, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ?
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Not found")
        
        cursor.execute("SELECT * FROM journals WHERE id = ?", (journal_id,))
        journal = cursor.fetchone()
    
    return {
        "ai_prompts_enabled": bool(journal["ai_prompts_enabled"]),
        "template_type": journal["template_type"]
    }

@app.patch("/api/journals/{journal_id}/settings")
def update_journal_settings(journal_id: str, data: dict, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ?
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Not found")
        
        now = datetime.now().isoformat()
        
        if "ai_prompts_enabled" in data:
            cursor.execute(
                "UPDATE journals SET ai_prompts_enabled = ?, updated_at = ? WHERE id = ?",
                (1 if data["ai_prompts_enabled"] else 0, now, journal_id)
            )
        
        conn.commit()
    
    return {"message": "Updated"}

@app.post("/api/journals/{journal_id}/entries")
def create_entry(journal_id: str, data: dict, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ?
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Not found")
        
        entry_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        cursor.execute(
            "INSERT INTO entries (id, journal_id, author_id, body, encrypted_body, nonce, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (entry_id, journal_id, user.id, data.get("body"), data.get("encrypted_body"), data.get("nonce"), now)
        )
        
        cursor.execute(
            "UPDATE user_streaks SET current_streak = current_streak + 1, last_entry_date = ?, updated_at = ? WHERE user_id = ?",
            (now, now, user.id)
        )
        
        conn.commit()
    
    return {"id": entry_id, "created_at": now}

@app.patch("/api/journals/{journal_id}/entries/{entry_id}")
def update_entry(journal_id: str, entry_id: str, data: dict, user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM entries WHERE id = ? AND journal_id = ? AND author_id = ?
        """, (entry_id, journal_id, user.id))
        entry = cursor.fetchone()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        now = datetime.now().isoformat()
        
        body = data.get("body")
        encrypted_body = data.get("encrypted_body")
        nonce = data.get("nonce")
        
        if body is not None:
            cursor.execute(
                "UPDATE entries SET body = ?, encrypted_body = ?, nonce = ?, edited_at = ? WHERE id = ?",
                (body, encrypted_body, nonce, now, entry_id)
            )
        
        conn.commit()
    
    return {"message": "Updated"}

@app.get("/api/invites")
def get_invites(user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.*, j.name as journal_name FROM invites i
            JOIN journals j ON i.journal_id = j.id
            JOIN journal_members jm ON i.journal_id = jm.journal_id
            WHERE jm.user_id = ? AND i.used_by IS NULL
            ORDER BY i.created_at DESC
        """, (user.id,))
        invites = cursor.fetchall()
    
    return [
        {
            "id": i["id"],
            "journal_id": i["journal_id"],
            "journal_name": i["journal_name"],
            "code": i["code"],
            "expires_at": i["expires_at"],
            "created_at": i["created_at"]
        }
        for i in invites
    ]

@app.post("/api/invites")
def create_invite(data: dict, user: UserOut = Depends(get_current_user)):
    journal_id = data.get("journal_id")
    code = data.get("code", "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8)))
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ?
        """, (journal_id, user.id))
        membership = cursor.fetchone()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Not found")
        
        invite_id = str(uuid.uuid4())
        now = datetime.now()
        expires_at = (now + timedelta(days=7)).isoformat()
        created_at = now.isoformat()
        
        cursor.execute(
            "INSERT INTO invites (id, journal_id, code, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (invite_id, journal_id, code, user.id, expires_at, created_at)
        )
        
        conn.commit()
    
    return {"id": invite_id, "code": code, "journal_id": journal_id, "expires_at": expires_at}

@app.post("/api/invites/accept")
def accept_invite(data: dict, user: UserOut = Depends(get_current_user)):
    code = data.get("code", "").upper().strip()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM invites WHERE code = ? AND used_by IS NULL
        """, (code,))
        invite = cursor.fetchone()
        
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid or expired invite")
        
        if datetime.fromisoformat(invite["expires_at"]) < datetime.now():
            raise HTTPException(status_code=400, detail="Invite expired")
        
        cursor.execute("""
            SELECT * FROM journal_members WHERE journal_id = ? AND user_id = ?
        """, (invite["journal_id"], user.id))
        existing = cursor.fetchone()
        
        if existing:
            raise HTTPException(status_code=400, detail="Already a member")
        
        member_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        cursor.execute(
            "INSERT INTO journal_members (id, journal_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)",
            (member_id, invite["journal_id"], user.id, "member", now)
        )
        
        cursor.execute(
            "UPDATE invites SET used_by = ?, used_at = ? WHERE id = ?",
            (user.id, now, invite["id"])
        )
        
        conn.commit()
    
    return {"journalId": invite["journal_id"]}

@app.get("/api/prompts/daily")
def get_daily_prompt(user: UserOut = Depends(get_current_user)):
    today = datetime.now().date().isoformat()
    
    prompts = [
        "What made you smile today?",
        "What's something you're grateful for right now?",
        "How are you feeling in this moment?",
        "What's on your mind?",
        "What's something kind you did for yourself today?",
        "Describe a small moment that mattered to you.",
        "What would you like to remember about today?",
        "What's something you're looking forward to?",
        "How did you show up for yourself today?",
        "What's a thought you'd like to let go of?",
    ]
    
    hash_val = int(hashlib.md5(today.encode()).hexdigest(), 16)
    prompt = prompts[hash_val % len(prompts)]
    
    return {"date": today, "prompt": prompt}

@app.get("/api/streaks")
def get_streak(user: UserOut = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_streaks WHERE user_id = ?", (user.id,))
        streak = cursor.fetchone()
    
    if not streak:
        return {"current_streak": 0, "longest_streak": 0}
    
    return {
        "current_streak": streak["current_streak"],
        "longest_streak": streak["longest_streak"],
        "last_entry_date": streak["last_entry_date"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
