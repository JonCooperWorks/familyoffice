# Update Report from Chat Prompt

Today's date is ${currentDate}.

**Working Directory:** Your working directory is `${tempDir}`. You can save any intermediate files here if needed.

${chatHistorySection}

Based on our conversation above, please generate a comprehensive updated research report about ${ticker}. 

**IMPORTANT: This is an update task - use ONLY the information from our chat conversation and any existing report context. Do NOT perform new web searches or research.**

The report should:
- Incorporate all the insights and information we've discussed in our chat
- Include any information you've found during our conversation  
- Be well-structured with clear sections following the standard format
- Maintain a professional, analytical tone
- Include specific data points, metrics, and analysis from our conversation
- Reference specific points from our conversation where relevant
- Build upon the existing report context if available

**Output the updated report using this structure:**
	1.	Who are they?
	2.	How will they make money?
	3.	What is their competitive advantage?
	4.	Why is investing now likely to provide outsized returns?
	5.	Tailwinds
	6.	Headwinds
	7.	When should I sell?
	8.	Why should I buy this stock?
	9.	Why should I avoid this stock?
	10.	Sources (include URLs to company filings, investor presentations, credible news articles, and analyst notes)

And add new headings based on information we've discussed, such as competitiors.

**Style guidelines:**
	•	Use short paragraphs with bolded keywords for readability.
	•	Where helpful, add tables (e.g., product lines, competitors, valuation metrics).
	•	Highlight both the bull case and bear case clearly.
	•	Include numbers, growth rates, margins, TAM if available from our conversation.
	•	Keep it grounded in evidence from our chat discussion and existing context.
	•	**Reference insights from our conversation** using clear language like "As discussed earlier..." or "Building on our conversation about..."
	•	Focus on synthesizing and organizing the information we've already discussed.
	•	Do not refer to the chat, refer only to sources
	•	Retain all the information in the original document

Please provide the complete updated report now.
