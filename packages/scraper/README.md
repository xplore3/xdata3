Typical Application Scenarios and Tool Combinations​​

1. Static Page Crawling |	Lightweight, High Speed
  - Requests + BeautifulSoup 
2. Dynamic Rendering Pages |	Supports JavaScript Execution & Interactive Operations
  -	Selenium + ChromeDriver
3. Large-Scale Data Integration & AI Crawlers| Structured Storage & Multi-Source Data Merging
  - Crawl4AI
  - BrowserUse
  - AI General Vision (LLM Vision)	


------------------------------------------
1. Crawl4AI
On a computer environment with Docker installed.

docker pull unclecode/crawl4ai
docker run -d -p 11235:11235 --name crawl4ai --shm-size=1g unclecode/crawl4ai
# Visit the playground at http://localhost:11235/playground

Official Website: https://docs.crawl4ai.com/

2. 