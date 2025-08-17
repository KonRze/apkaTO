from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from . import models, schemas, database
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from sqlalchemy import or_
import os
import shutil
from fastapi.staticfiles import StaticFiles
from datetime import datetime


models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Notatnik Sieciowy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ==================== NOTES ====================

@app.get("/notes/", response_model=list[schemas.Note])
def read_notes(q: Optional[str] = Query(None, description="Szukana fraza")):
    db = database.SessionLocal()
    if q:
        return db.query(models.Note).filter(
            or_(
                models.Note.title.ilike(f"%{q}%"),
                models.Note.content.ilike(f"%{q}%")
            )
        ).all()
    return db.query(models.Note).all()


@app.post("/notes/", response_model=schemas.Note)
def create_note(
    title: str = Form(...),
    content: str = Form(...),
    file: UploadFile = File(None),
    reminder_at: str = Form(None)   # <-- NOWE
):
    db = database.SessionLocal()
    file_url = None

    if file:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/uploads/{file.filename}"

    reminder_dt = None
    if reminder_at:
        # np. "2025-08-11T14:30" z <input type="datetime-local">
        reminder_dt = datetime.fromisoformat(reminder_at)

    note = models.Note(
        title=title,
        content=content,
        file_url=file_url,
        reminder_at=reminder_dt
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@app.put("/notes/{note_id}", response_model=schemas.Note)
def update_note(
    note_id: int,
    title: str = Form(...),
    content: str = Form(...),
    file: UploadFile = File(None),
    reminder_at: str = Form(None)   # <-- NOWE
):
    db = database.SessionLocal()
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    db_note.title = title
    db_note.content = content

    if file:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        db_note.file_url = f"/uploads/{file.filename}"

    if reminder_at is not None:
        db_note.reminder_at = (
            datetime.fromisoformat(reminder_at) if reminder_at else None
        )

    db.commit()
    db.refresh(db_note)
    return db_note


@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    db = database.SessionLocal()
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return
