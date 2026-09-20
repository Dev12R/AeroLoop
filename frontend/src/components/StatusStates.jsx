export function Loading({ label = "Loading live forecast…" }) {
  return <div className="state-box">{label}</div>;
}

export function ErrorBox({ message }) {
  return (
    <div className="error-box">
      Couldn't reach the AeroLoop backend or its upstream data sources: {message}
      <br />
      Make sure the backend is running (<code>uvicorn app.main:app</code> in{" "}
      <code>backend/</code>) and reachable at the configured API base URL.
    </div>
  );
}
