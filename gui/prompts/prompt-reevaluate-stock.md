# Reevaluation Agent Prompt

Today's date is ${currentDate}.

**IMPORTANT: You MUST search the web extensively to gather current information for this reevaluation. Verify every claim with up-to-date sources.**

**Working Directory:** Your working directory is `${tempDir}`. Save any intermediate files (HTML, XML, downloaded documents, etc.) here. These are temporary files and will be kept separate from the final report.

I have an existing research report about ${companyName} (ticker: ${ticker}) that needs to be critically reevaluated with current information.

## Original Report to Reevaluate:

---
${reportContent}
---

## Your Task:

Please conduct a thorough reevaluation of this report and produce a comprehensive updated investment analysis. Your analysis should:

**Critical Examination:**
1. **Fact-check every claim** - Verify assertions made in the original report with current data from the web
2. **Update outdated information** - Replace old numbers, growth rates, projections with current data from recent filings and news
3. **Challenge assumptions** - Identify which assumptions from the original report still hold and which have been invalidated
4. **Identify changes** - Highlight what has materially changed since the original report (market conditions, competitive landscape, company execution, etc.)
5. **Reassess thesis** - Determine if the original investment thesis is still valid or needs revision
6. **Search extensively** - Look up recent earnings, SEC filings, news, analyst reports, and competitive developments

**Output the updated report using the same structure:**
	1.	Who are they?
	2.	How will they make money?
	3.	What is their competitive advantage?
	4.	Why is investing now likely to provide outsized returns?
	5.	Tailwinds
	6.	Headwinds
	7.	When should I sell?
	8.	What has changed since the last report? (NEW SECTION - highlight key updates)
	9.	Why should I buy this stock?
	10.	Why should I avoid this stock?
	11.	Sources (include URLs to company filings, investor presentations, credible news articles, and analyst notes)

**Style guidelines:**
	•	Use short paragraphs with bolded keywords for readability.
	•	Where helpful, add tables (e.g., product lines, competitors, valuation metrics).
	•	Highlight both the bull case and bear case clearly.
	•	Include numbers, growth rates, margins, TAM if available.
	•	Keep it grounded in evidence, citing sources with working URLs.
	•	**Every major claim should be backed by a web search and source URL.**
	•	**Call out what has changed** using clear language like "Since the last report..." or "Updated from previous estimate..."
	•	Be honest about what was wrong or has shifted in the original analysis.
	•	Clearly distinguish between claims that have been verified vs. those that were invalidated.

