# Research Agent Prompt 

Today's date is ${currentDate}.

**FORMAT: Use GitHub-flavored markdown for all output.**

**IMPORTANT: You MUST search the web extensively to gather current information. Do not rely on your training data alone.**

**Working Directory:** Your working directory is `${tempDir}`. Save any intermediate files (HTML, XML, downloaded documents, etc.) here. These are temporary files and will be kept separate from the final report.

Write a comprehensive investment analysis of ${companyName} (ticker: ${ticker}) in the style of a professional equity research memo. Structure the output with the following sections:
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

Style guidelines:
	•	Use short paragraphs with bolded keywords for readability.
	•	Where helpful, add tables (e.g., product lines, competitors, valuation metrics).
	•	Highlight both the bull case and bear case clearly.
	•	Include numbers, growth rates, margins, TAM if available.
	•	Keep it grounded in evidence, citing sources with working URLs.
	•	**Every major claim should be backed by a web search and source URL.**
	•	Search for: recent earnings reports, SEC filings, investor presentations, analyst coverage, news articles, competitive analysis.
