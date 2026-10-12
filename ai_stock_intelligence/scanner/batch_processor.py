"""
Batch processor with rate limiting, error resilience, and progress tracking for the market scanner.
"""

from typing import List, Dict, Any, Callable, Optional
import time
from concurrent.futures import ThreadPoolExecutor, as_completed


class BatchProcessor:
    def __init__(self, max_workers: int = 4, delay_between_batches: float = 0.2):
        self.max_workers = max_workers
        self.delay_between_batches = delay_between_batches

    def process_batches(
        self,
        items: List[Any],
        process_fn: Callable[[Any], Optional[Dict[str, Any]]],
        batch_size: int = 25,
        progress_callback: Optional[Callable[[int, int, int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes items in controlled sequential batches with worker thread pooling.
        If any individual item fails, it logs failure and continues without crashing.
        """
        results: List[Dict[str, Any]] = []
        total = len(items)
        processed = 0
        successful = 0
        failed = 0
        skipped = 0

        for i in range(0, total, batch_size):
            chunk = items[i:i + batch_size]
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_item = {executor.submit(process_fn, item): item for item in chunk}
                for future in as_completed(future_to_item):
                    item = future_to_item[future]
                    processed += 1
                    try:
                        res = future.result()
                        if res is not None:
                            results.append(res)
                            successful += 1
                        else:
                            skipped += 1
                    except Exception:
                        failed += 1

                    if progress_callback:
                        progress_callback(processed, successful, failed, skipped)

            time.sleep(self.delay_between_batches)

        return results
