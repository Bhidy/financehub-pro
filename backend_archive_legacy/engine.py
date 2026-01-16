import asyncio
import aiohttp
import logging
import json
import time
from backend.headers import get_headers

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ExtractionEngine:
    def __init__(self, concurrency=10):
        self.concurrency = concurrency
        self.queue = asyncio.Queue()
        self.results = []
        self.active_workers = 0
        self.total_processed = 0

    async def worker(self, name):
        self.active_workers += 1
        logger.info(f"Worker {name} started")
        
        async with aiohttp.ClientSession() as session:
            while True:
                task = await self.queue.get()
                if task is None:
                    break
                
                url, metadata = task
                try:
                    # In a real scenario, we would use a proxy here
                    # proxy = get_next_proxy() 
                    headers = get_headers()
                    
                    start_time = time.time()
                    async with session.get(url, headers=headers, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            self.results.append({
                                'url': url,
                                'status': 200,
                                'data': data,
                                'metadata': metadata,
                                'time': time.time() - start_time
                            })
                            logger.info(f"[{name}] Success: {url}")
                        else:
                            logger.warn(f"[{name}] Failed: {url} (Status {response.status})")
                except Exception as e:
                    logger.error(f"[{name}] Error fetching {url}: {e}")
                finally:
                    self.queue.task_done()
                    self.total_processed += 1
                    await asyncio.sleep(0.5) # Basic rate limit

        self.active_workers -= 1
        logger.info(f"Worker {name} stopped")

    async def run(self, tasks):
        # tasks is a list of (url, metadata) tuples
        for t in tasks:
            await self.queue.put(t)

        start_time = time.time()
        workers = [asyncio.create_task(self.worker(f"w-{i}")) for i in range(self.concurrency)]
        
        # Wait for queue to be empty
        await self.queue.join()
        
        # Stop workers
        for _ in range(self.concurrency):
            await self.queue.put(None)
        await asyncio.gather(*workers)
        
        duration = time.time() - start_time
        logger.info(f"Extraction complete. Processed {self.total_processed} items in {duration:.2f}s")
        return self.results

if __name__ == "__main__":
    # Test run
    async def main():
        engine = ExtractionEngine(concurrency=2)
        test_tasks = [
            ("https://www.mubasher.info/api/1/market/tickers", {"type": "tickers"}),
            # Add more test URLs here
        ]
        await engine.run(test_tasks)

    asyncio.run(main())
