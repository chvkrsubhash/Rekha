import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showError, showSuccess } from '@/components/ui/Toast';
import { classroomsAPI } from '@/lib/api';

interface CreateClassroomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Telugu',
  'Hindi',
  'Geography',
  'History',
  'Economics',
  'Computer Science',
  'Competitive Exams',
];

export function CreateClassroomModal({ open, onOpenChange, onCreated }: CreateClassroomModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      const created = await classroomsAPI.create({
        name: name.trim(),
        subject,
        grade: grade.trim() || undefined,
        section: section.trim() || undefined,
        description: description.trim() || undefined,
      });
      showSuccess(`Classroom created! Join code: ${created.code}`);
      setName('');
      setGrade('');
      setSection('');
      setDescription('');
      onCreated();
    } catch {
      showError('Failed to create classroom.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Classroom"
      description="Students can join using the automatically generated 6-character code."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Classroom Name"
          placeholder="e.g. Class 10 Mathematics — Batch A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-primary focus:outline-none"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Grade / Class"
            placeholder="e.g. Class 10"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
          <Input
            label="Section"
            placeholder="e.g. Section A"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Description (optional)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Syllabus or classroom notes..."
            className="w-full rounded-md border border-slate-200 p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Classroom
          </Button>
        </div>
      </form>
    </Modal>
  );
}

