import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import type { ExpertRouting } from "@/schemas/chat.schema";

export function ExpertIntroCard({ routing }: { routing: ExpertRouting }) {
  return (
    <Card className="border-warning/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Confidence too low — routing to an expert
          <Badge variant="warning">Low confidence</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="font-medium">{routing.contributorName}</span> has the most relevant
          history here.
        </p>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Evidence</p>
          <p>{routing.evidence}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Drafted intro message</p>
          <p className="rounded-md bg-muted p-3">{routing.draftMessage}</p>
        </div>
      </CardContent>
    </Card>
  );
}
