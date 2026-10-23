import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form, ListGroup } from "react-bootstrap";
import { api } from "../../shared/api";
import type { BacklogItem } from "../../shared/types";

export function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try { setItems(await api<BacklogItem[]>("/backlog/items")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load backlog."); }
  }
  useEffect(() => { void refresh(); }, []);

  async function addItem(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/backlog/items", { method: "POST", body: JSON.stringify({ title, description: description || null }) });
      setTitle("");
      setDescription("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add item."); }
  }

  async function toggle(item: BacklogItem) {
    try {
      await api(`/backlog/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_completed: !item.is_completed }) });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update item."); }
  }

  async function remove(id: string) {
    try {
      await api(`/backlog/items/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete item."); }
  }

  return (
    <>
      <div className="mb-4"><p className="muted-label mb-2">Ideas for another day</p><h1 className="page-title fw-bold">Backlog</h1><p className="text-secondary">Keep unscheduled intentions without adding pressure or dates.</p></div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="surface-card mb-3"><Card.Body className="p-4">
        <Form onSubmit={addItem} className="row g-3 align-items-end">
          <Form.Group className="col-md-5"><Form.Label>Intention</Form.Label><Form.Control required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Update portfolio" /></Form.Group>
          <Form.Group className="col-md-5"><Form.Label>Optional note</Form.Label><Form.Control value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context" /></Form.Group>
          <div className="col-md-2"><Button type="submit" className="w-100">Add</Button></div>
        </Form>
      </Card.Body></Card>
      <Card className="surface-card"><ListGroup variant="flush">
        {items.length === 0 ? <ListGroup.Item className="bg-transparent text-secondary py-4">Your backlog is clear for now.</ListGroup.Item> : items.map((item) => (
          <ListGroup.Item key={item.id} className="bg-transparent py-3 d-flex align-items-center gap-3">
            <Form.Check type="checkbox" checked={item.is_completed} onChange={() => void toggle(item)} aria-label={`Mark ${item.title} ${item.is_completed ? "incomplete" : "complete"}`} />
            <div className="flex-grow-1"><span className={item.is_completed ? "text-decoration-line-through text-secondary" : ""}>{item.title}</span>{item.description && <div className="small text-secondary">{item.description}</div>}</div>
            <Button variant="outline-secondary" size="sm" onClick={() => void remove(item.id)}>Remove</Button>
          </ListGroup.Item>
        ))}
      </ListGroup></Card>
    </>
  );
}
