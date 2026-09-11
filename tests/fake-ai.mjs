import { WorkerEntrypoint } from 'cloudflare:workers';
export default class FakeAI extends WorkerEntrypoint {
  run() { throw new Error('3036: You have used up your daily free allocation of 10,000 neurons.'); }
}
