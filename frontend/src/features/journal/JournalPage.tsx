import { FormEvent, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, ListGroup, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import type { DailySheet, MoodEntry, Reflection } from "../../shared/types";
import { Icon } from "../../shared/Icon";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function JournalPage() {
  const [sheets, setSheets] = useState<DailySheet[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [reflectionContent, setReflectionContent] = useState("");
  const [reflectionPeriod, setReflectionPeriod] = useState<"weekly" | "monthly">("weekly");
  const [periodStart, setPeriodStart] = useState(localDate());
  const [editingReflection, setEditingReflection] = useState<string | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [dailySheets, moodEntries, reflectionEntries] = await Promise.all([
        api<DailySheet[]>("/daily-sheets"),
        api<MoodEntry[]>("/moods"),
        api<Reflection[]>("/reflections"),
      ]);
      setSheets(dailySheets.filter((sheet) => sheet.sheet_date < localDate()));
      setMoods(moodEntries);
      setReflections(reflectionEntries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load journal.");
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function deleteMood(id: string) {
    try {
      await api(`/moods/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete mood entry."); }
  }

  async function createReflection(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/reflections", {
        method: "POST",
        body: JSON.stringify({ period_type: reflectionPeriod, period_start: periodStart, content: reflectionContent }),
      });
      setReflectionContent("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save reflection."); }
  }

  async function saveReflection(id: string) {
    try {
      await api(`/reflections/${id}`, { method: "PATCH", body: JSON.stringify({ content: reflectionDraft }) });
      setEditingReflection(null);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update reflection."); }
  }

  async function deleteReflection(id: string) {
    try {
      await api(`/reflections/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete reflection."); }
  }

  return (
    <>
      <div className="page-heading"><p className="eyebrow mb-2">Look back with kindness</p><h1 className="page-title"><Icon name="journal" className="heading-icon" />Your journal</h1><p className="page-subtitle">A quiet place for the moments, thoughts, and feelings you want to keep.</p></div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row className="g-3 mb-4">
        <Col lg={5}>
          <Card className="surface-card accent-rose h-100"><Card.Body>
            <p className="eyebrow">Mood moments</p>
            <p className="small text-secondary">Check in on today’s Daily Sheet. Your past moments stay here.</p>
            <ListGroup variant="flush">{moods.slice(0, 6).map((entry) => (
              <ListGroup.Item key={entry.id} className="bg-transparent d-flex justify-content-between align-items-center gap-2 px-0">
                <span><span className="me-2" aria-hidden="true">{({ great: "😀", good: "🙂", okay: "😐", low: "😔" } as Record<string, string>)[entry.mood] ?? "🙂"}</span><span className="text-capitalize">{entry.mood}</span><span className="text-secondary small"> · {entry.entry_date} · {entry.period}</span>{entry.note && <div className="small text-secondary">{entry.note}</div>}</span>
                <Button size="sm" variant="outline-danger" onClick={() => void deleteMood(entry.id)}>Remove</Button>
              </ListGroup.Item>
            ))}</ListGroup>
            {moods.length === 0 && <p className="text-secondary mb-0">Your check-ins will gather here over time.</p>}
            <Link className="d-inline-block mt-3" to="/daily-sheet">Check in for today →</Link>
          </Card.Body></Card>
        </Col>
        <Col lg={7}>
          <Card className="surface-card accent-purple h-100"><Card.Body>
            <p className="eyebrow">Reflection</p>
            <Form onSubmit={createReflection} className="row g-2">
              <Form.Group className="col-sm-4"><Form.Label>Period</Form.Label><Form.Select value={reflectionPeriod} onChange={(e) => setReflectionPeriod(e.target.value as "weekly" | "monthly")}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></Form.Select></Form.Group>
              <Form.Group className="col-sm-4"><Form.Label>Period starts</Form.Label><Form.Control type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></Form.Group>
              <Form.Group className="col-12"><Form.Label>What stood out?</Form.Label><Form.Control as="textarea" rows={3} required maxLength={10000} value={reflectionContent} onChange={(e) => setReflectionContent(e.target.value)} /></Form.Group>
              <div className="col-12"><Button type="submit">Save reflection</Button></div>
            </Form>
            <ListGroup variant="flush" className="mt-3">{reflections.map((entry) => (
              <ListGroup.Item key={entry.id} className="bg-transparent px-0">
                <div className="d-flex justify-content-between gap-2"><span className="text-capitalize fw-semibold">{entry.period_type} · {entry.period_start}</span><div className="d-flex gap-2">
                  {editingReflection === entry.id ? <Button size="sm" onClick={() => void saveReflection(entry.id)}>Save</Button> : <Button size="sm" variant="outline-secondary" onClick={() => { setEditingReflection(entry.id); setReflectionDraft(entry.content); }}>Edit</Button>}
                  <Button size="sm" variant="outline-secondary" onClick={() => void deleteReflection(entry.id)}>Remove</Button>
                </div></div>
                {editingReflection === entry.id ? <Form.Control as="textarea" rows={3} className="mt-2" value={reflectionDraft} onChange={(e) => setReflectionDraft(e.target.value)} /> : <p className="text-secondary mt-2 mb-0">{entry.content}</p>}
              </ListGroup.Item>
            ))}</ListGroup>
          </Card.Body></Card>
        </Col>
      </Row>
      {sheets.length === 0 ? <Card className="surface-card"><Card.Body className="p-4 text-secondary">Past Daily Sheets will appear here.</Card.Body></Card> : (
        <Row className="g-3">{sheets.map((sheet) => (
          <Col md={6} key={sheet.id}>
            <Card className="surface-card"><Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <h2 className="h5">{new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date(`${sheet.sheet_date}T12:00:00`))}</h2>
                {sheet.is_edited_later && <Badge bg="info">Edited Later</Badge>}
              </div>
              {sheet.highlights?.length ? <><p className="muted-label mb-1">Highlights</p><ul>{sheet.highlights.map((highlight, i) => <li key={`${i}-${highlight}`}>{highlight}</li>)}</ul></> : null}
              {sheet.tasks?.length ? <><p className="muted-label mb-1">Tasks</p><ul>{sheet.tasks.map((task, i) => <li key={`${i}-${task.title}`}>{task.title}</li>)}</ul></> : null}
              {sheet.notes && <><p className="muted-label mb-1">Notes</p><p className="text-secondary">{sheet.notes}</p></>}
              <Link to={`/daily-sheet?date=${sheet.sheet_date}`}><Button variant="outline-primary" size="sm">View / edit</Button></Link>
            </Card.Body></Card>
          </Col>
        ))}</Row>
      )}
    </>
  );
}
