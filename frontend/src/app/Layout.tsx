import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Container, Nav, Navbar } from "react-bootstrap";

const links = [
  ["Home", "/"],
  ["Daily Sheet", "/daily-sheet"],
  ["Calendar", "/calendar"],
  ["Habits", "/habits"],
  ["Backlog", "/backlog"],
  ["Journal", "/journal"],
  ["Settings", "/settings"],
];

export function Layout() {
  const navigate = useNavigate();
  const signOut = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <>
      <Navbar expand="lg" className="app-navbar border-bottom">
        <Container fluid="lg">
          <Navbar.Brand as={NavLink} to="/" className="fw-semibold">Personal OS</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {links.map(([label, to]) => (
                <Nav.Link as={NavLink} to={to} end={to === "/"} key={to}>{label}</Nav.Link>
              ))}
            </Nav>
            <Button variant="outline-secondary" size="sm" onClick={signOut}>Sign out</Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <main className="py-4 py-lg-5">
        <Container fluid="lg"><Outlet /></Container>
      </main>
    </>
  );
}
