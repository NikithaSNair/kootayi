import RoleGate from "./RoleGate";

// First launch: role chooser (Customer / Worker), then lightweight signup.
export default function Home() {
  return <RoleGate />;
}
