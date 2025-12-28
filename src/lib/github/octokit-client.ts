import { Octokit } from "@octokit/rest";

class OctokitClient {
  private static instance: OctokitClient;
  private octokit: Octokit;
  private token: string | null = null;

  private constructor() {
    this.octokit = new Octokit();
  }

  public static getInstance(): OctokitClient {
    if (!OctokitClient.instance) {
      OctokitClient.instance = new OctokitClient();
    }
    return OctokitClient.instance;
  }

  public setToken(token: string) {
    this.token = token;
    this.octokit = new Octokit({
      auth: token,
    });
  }

  public getOctokit(): Octokit {
    return this.octokit;
  }

  public hasAuth(): boolean {
    return this.token !== null;
  }

  public clearToken() {
    this.token = null;
    this.octokit = new Octokit();
  }
}

export default OctokitClient;
