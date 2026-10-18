export type QuizQuestion = { id: number; q: string; options: string[]; answer: number; tag?: string };

export const QUIZ: QuizQuestion[] = [
  { id: 1, q: "You reach the customer's house. What must you do before starting work?", options: ["Start working immediately", "Ask the customer for the 4-digit PIN and enter it in the app", "Call the office", "Wait outside for an hour"], answer: 1 },
  { id: 2, q: "You need to buy an extra pipe / material costing ₹150. What should you do?", options: ["Buy it and add it to the bill later", "Request the extra charge in the app and wait for customer approval", "Ask the customer for cash secretly", "Skip the work"], answer: 1 },
  { id: 3, q: "Before cooking in a customer's kitchen you should:", options: ["Wash hands with soap", "Only wipe hands on clothes", "Nothing", "Wear shoes inside the kitchen"], answer: 0 },
  { id: 4, q: "Which chemicals should NEVER be mixed while cleaning a washroom?", options: ["Soap and water", "Bleach and acid-based toilet cleaner", "Water and vinegar", "Detergent and water"], answer: 1 },
  { id: 5, q: "Before touching any electrical wiring you must:", options: ["Switch off the MCB / main supply", "Use wet hands", "Keep the power on to test", "Use a steel spoon"], answer: 0, tag: "electrical" },
  { id: 6, q: "A customer is unhappy with the work. What is the right response?", options: ["Argue with them", "Leave immediately", "Listen politely and try to fix the issue, or report in the app", "Ask for more money"], answer: 2 },
  { id: 7, q: "A water pipe is leaking heavily. The first step is to:", options: ["Close the main water valve", "Cover it with a cloth", "Call the customer's neighbour", "Increase the motor speed"], answer: 0, tag: "plumbing" },
  { id: 8, q: "Customer's personal belongings found while cleaning should be:", options: ["Kept by you", "Thrown away", "Handed over to the customer", "Ignored"], answer: 2 },
  { id: 9, q: "Your live location is shared during a job because:", options: ["It is for customer safety and arrival tracking", "It is not shared", "To track your personal life", "For advertisements"], answer: 0 },
  { id: 10, q: "What is the pass mark for this quiz?", options: ["30%", "50%", "70%", "100%"], answer: 2 },
];

export const PASS_PERCENT = 70;

export function publicQuiz() {
  return QUIZ.map(({ id, q, options, tag }) => ({ id, q, options, tag }));
}

/** Grades only the questions relevant to the worker's skills (trade questions are skill-specific). */
export function gradeQuiz(answers: Record<string, number>, skills: string[]) {
  const applicable = QUIZ.filter((q) => !q.tag || skills.includes(q.tag));
  let correct = 0;
  for (const qq of applicable) if (answers[String(qq.id)] === qq.answer) correct++;
  const score = Math.round((correct / applicable.length) * 100);
  return { score, passed: score >= PASS_PERCENT, correct, total: applicable.length };
}
