export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha?: string;
}

export interface RepositoryConfig {
  owner: string;
  repo: string;
  filePath: string;
}

export interface GASError {
  message: string;
  name?: string;
}

declare global {
  interface Window {
    google: {
      script: {
        run: {
          withSuccessHandler: (callback: (result: any) => void) => {
            withFailureHandler: (callback: (error: GASError) => void) => {
              [key: string]: (...args: any[]) => void;
            };
          };
        };
      };
    };
  }
}
