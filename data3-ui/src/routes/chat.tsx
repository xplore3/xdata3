import { useParams } from "react-router";
import Chat from "@/components/chat";
import type { UUID } from "@data3os/agentcontext";

export default function AgentRoute() {
    const { agentId } = useParams<{ agentId: UUID }>();

    if (!agentId) return <div>No data.</div>;

    return <Chat agentId={agentId} />;
}
