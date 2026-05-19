export function parseChecklistItems(text) {
  return String(text || "")
    .split("<br>")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stepKey(questionNumber, subIndex = 0) {
  return `${questionNumber}:${subIndex}`;
}

export function parseQuestionStructure(question) {
  const enunciado = String(question?.enunciado || "").trim();
  const checklistItems = parseChecklistItems(question?.lista_cotejo || "");
  const regex = /(?:^|\n)\s*([a-d])\)\s+/gi;
  const matches = [...enunciado.matchAll(regex)];

  if (!matches.length) {
    return {
      caseText: enunciado,
      subQuestions: [],
      checklistItems,
    };
  }

  const firstStart = matches[0].index ?? 0;
  const caseText = enunciado.slice(0, firstStart).trim();
  const subQuestions = matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? enunciado.length : enunciado.length;
    return enunciado.slice(start, end).trim();
  });

  return {
    caseText,
    subQuestions,
    checklistItems,
  };
}

export function buildQuestionSteps(questions = [], phase = "base") {
  return questions.flatMap((question, questionIndex) => {
    const parsed = parseQuestionStructure(question);
    const subQuestions = parsed.subQuestions.length ? parsed.subQuestions : [null];
    const itemCount = Math.max(subQuestions.length, 1);
    const perItemScore = Number(question?.puntaje_sugerido || 0) / itemCount;

    return subQuestions.map((subQuestion, subIndex) => ({
      id: `${phase}-${question.numero}-${subIndex}`,
      key: stepKey(question.numero, subIndex),
      phase,
      question,
      questionIndex,
      subIndex,
      order: question.orden || questionIndex + 1,
      caseText: parsed.caseText,
      prompt: subQuestion,
      checklistItem: parsed.checklistItems[subIndex] || parsed.checklistItems[0] || "",
      checklistItems: parsed.checklistItems,
      puntajeMaximo: Number(perItemScore.toFixed(2)),
      hasSubQuestions: parsed.subQuestions.length > 0,
    }));
  });
}
