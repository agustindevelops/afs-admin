import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/leads-api";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;

  const flow = await prisma.intakeFlow.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        include: {
          edgesFrom: {
            orderBy: { sortOrder: "asc" },
            include: {
              toQuestion: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
  });

  if (!flow) {
    return jsonError("Intake flow not found", 404);
  }

  const startQuestion =
    flow.questions.find((question) => question.key === "coverage") ??
    flow.questions[0];

  if (!startQuestion) {
    return jsonError("Intake flow has no questions", 500);
  }

  return Response.json({
    flow: {
      id: flow.id,
      slug: flow.slug,
      name: flow.name,
      version: flow.version,
    },
    startQuestionKey: startQuestion.key,
    questions: flow.questions.map((question) => ({
      id: question.id,
      key: question.key,
      prompt: question.prompt,
      helpText: question.helpText,
      answerType: question.answerType,
      mapsToLeadField: question.mapsToLeadField,
      sortOrder: question.sortOrder,
      edges: question.edgesFrom.map((edge) => ({
        id: edge.id,
        choiceKey: edge.choiceKey,
        choiceLabel: edge.choiceLabel,
        choiceDescription: edge.choiceDescription,
        outcome: edge.outcome,
        redirectUrl: edge.redirectUrl,
        toQuestionKey: edge.toQuestion?.key ?? null,
        sortOrder: edge.sortOrder,
      })),
    })),
  });
}
