import Bottleneck from 'bottleneck';

export class RateLimiter {
    private static instance: RateLimiter;
    private bitcoinTax: Bottleneck;
    private cryptoCompare: Bottleneck;

    private constructor() {
        this.bitcoinTax = new Bottleneck({ minTime: 500 });
        this.cryptoCompare = new Bottleneck({ minTime: 500 });
    }

    public static getInstance(): RateLimiter {
        if (!RateLimiter.instance) {
            RateLimiter.instance = new RateLimiter();
        }
        return RateLimiter.instance;
    }

    public scheduleBitcoinTax<T>(cb: () => Promise<T>) {
        return this.bitcoinTax.schedule(cb);
    }

    public scheduleCryptocompare<T>(cb: () => Promise<T>) {
        return this.cryptoCompare.schedule(cb);
    }
}
