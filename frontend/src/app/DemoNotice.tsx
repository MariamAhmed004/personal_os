import { useState } from "react";
import { Alert, Button, Modal } from "react-bootstrap";
import { Icon } from "../shared/Icon";

const repositoryUrl = "https://github.com/MariamAhmed004/personal_os";

export function DemoNotice() {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <Alert variant="info" className="demo-notice mb-0">
        <span>You’re exploring the Personal OS demo. Changes are temporary and won’t be saved. Refreshing the page may reset your changes.</span>
        <Button
          type="button"
          variant="outline-info"
          size="sm"
          aria-label="About the Personal OS demo"
          onClick={() => setInfoOpen(true)}
        >
          <Icon name="help" className="button-icon" />
          <span>About</span>
        </Button>
      </Alert>
      <Modal show={infoOpen} onHide={() => setInfoOpen(false)} centered aria-labelledby="demo-info-title">
        <Modal.Header closeButton>
          <Modal.Title id="demo-info-title">Want to try the full Personal OS experience?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This online demo is designed to let you explore the interface. The full application includes persistent database storage, user authentication, and the AI assistant.</p>
          <p className="mb-0">Download the source code and follow the setup instructions in the GitHub repository to run the full application using Docker Compose.</p>
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">Open the Personal OS GitHub repository</a>
          <Button variant="outline-secondary" onClick={() => setInfoOpen(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
