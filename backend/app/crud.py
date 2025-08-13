from . import models, schemas

def get_notes(db):
    return db.query(models.Note).all()

def create_note(db, note: schemas.NoteCreate):
    db_note = models.Note(title=note.title, content=note.content)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note
