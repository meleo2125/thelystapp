/**
 * Simple Token Bucket rate limiter to govern outbound Jikan requests.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillPerMs: number // tokens per millisecond
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const wait = Math.ceil((1 - this.tokens) / this.refillPerMs);
      await new Promise(r => setTimeout(r, wait));
    }
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefill = now;
  }
}

// 1 token/sec sustained, burst up to 3
export const jikanBucket = new TokenBucket(3, 1 / 1000);
