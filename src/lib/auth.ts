import { AuthClient } from '@icp-sdk/auth/client';
import { Identity } from '@icp-sdk/core/agent';

const II_PROVIDER = import.meta.env.VITE_II_PROVIDER || 'https://identity.ic0.app';

let authClient: AuthClient | null = null;

export async function getAuthClient(): Promise<AuthClient> {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  return authClient;
}

export async function login(): Promise<Identity> {
  const client = await getAuthClient();

  return new Promise((resolve, reject) => {
    client.login({
      identityProvider: II_PROVIDER,
      maxTimeToLive: BigInt(4 * 60 * 60 * 1000 * 1000 * 1000), // 4 hours
      onSuccess: () => {
        resolve(client.getIdentity());
      },
      onError: (err) => {
        reject(new Error(err || 'Login failed'));
      },
    });
  });
}

export async function logout(): Promise<void> {
  const client = await getAuthClient();
  await client.logout();
  authClient = null;
}

export async function getIdentity(): Promise<Identity | null> {
  const client = await getAuthClient();
  if (await client.isAuthenticated()) {
    return client.getIdentity();
  }
  return null;
}

export async function isAuthenticated(): Promise<boolean> {
  const client = await getAuthClient();
  return client.isAuthenticated();
}
