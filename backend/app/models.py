from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_url = Column(String(255), nullable=True) 
    reminder_at = Column(DateTime, nullable=True)  