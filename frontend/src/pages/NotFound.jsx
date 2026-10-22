import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="narrow">
      <h1>Page not found</h1>
      <p><Link to="/">Back to the start</Link></p>
    </div>
  );
}
