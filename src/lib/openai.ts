import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeDocument = async (documentText: string, analysisType: string) => {
  try {
    const prompt = `Analyze the following legal document for ${analysisType}. 
    Provide a comprehensive analysis including key points, potential risks, and recommendations.
    
    Document:
    ${documentText}
    
    Analysis:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert AI assistant. Provide clear, accurate, and professional legal analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || 'Analysis failed';
  } catch (error) {
    console.error('Error analyzing document:', error);
    throw new Error('Failed to analyze document');
  }
};

export const generateCaseSummary = async (caseDetails: string) => {
  try {
    const prompt = `Generate a concise case summary for the following legal case. 
    Include key facts, legal issues, and outcomes.
    
    Case Details:
    ${caseDetails}
    
    Summary:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert AI assistant. Generate clear and concise case summaries.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content || 'Summary generation failed';
  } catch (error) {
    console.error('Error generating case summary:', error);
    throw new Error('Failed to generate case summary');
  }
};

export const legalResearch = async (query: string, jurisdiction: string = 'general') => {
  try {
    const prompt = `Conduct legal research on the following query for ${jurisdiction} jurisdiction. 
    Provide relevant case law, statutes, and legal principles.
    
    Query:
    ${query}
    
    Research Results:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a legal research AI assistant. Provide comprehensive and accurate legal research results.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || 'Research failed';
  } catch (error) {
    console.error('Error conducting legal research:', error);
    throw new Error('Failed to conduct legal research');
  }
};

export default openai;
