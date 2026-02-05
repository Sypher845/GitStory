// GitHub API service for fetching repository information

interface GitHubCommit {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
}

interface GitHubRepoInfo {
    fullName: string;
    description: string | null;
    defaultBranch: string;
    stars: number;
    forks: number;
    language: string | null;
    lastUpdated: string;
    url: string;
}

interface RecentCommitsResult {
    repo: string;
    branch: string;
    commits: GitHubCommit[];
}

interface RepoInfoResult {
    success: boolean;
    data?: GitHubRepoInfo;
    error?: string;
}

function getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const savedAuth = localStorage.getItem("gitstory-auth");
        if (savedAuth) {
            const parsed = JSON.parse(savedAuth);
            return parsed.accessToken || null;
        }
    } catch {
        // ignore
    }
    return null;
}

function getCurrentRepo(): { owner: string; repo: string; branch?: string } | null {
    if (typeof window === "undefined") return null;

    try {
        const savedRepo = localStorage.getItem("gitstory-repo");
        if (savedRepo) {
            const parsed = JSON.parse(savedRepo);
            if (parsed.owner && parsed.repo) {
                return {
                    owner: parsed.owner,
                    repo: parsed.repo,
                    branch: parsed.branch || undefined,
                };
            }
        }
    } catch {
        // ignore
    }
    return null;
}

export async function getRepoInfo(): Promise<RepoInfoResult> {
    const token = getAccessToken();
    const repoConfig = getCurrentRepo();

    if (!token) {
        return { success: false, error: "Not authenticated with GitHub" };
    }

    if (!repoConfig) {
        return { success: false, error: "No repository imported. Use the Import Code button to import a GitHub repository." };
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: `Repository ${repoConfig.owner}/${repoConfig.repo} not found` };
            }
            return { success: false, error: `GitHub API error: ${response.status}` };
        }

        const data = await response.json();

        return {
            success: true,
            data: {
                fullName: data.full_name,
                description: data.description,
                defaultBranch: data.default_branch,
                stars: data.stargazers_count,
                forks: data.forks_count,
                language: data.language,
                lastUpdated: data.updated_at,
                url: data.html_url,
            },
        };
    } catch (error) {
        return { success: false, error: `Failed to fetch repo info: ${error}` };
    }
}

export async function getRecentCommits(input: { count?: number }): Promise<{
    success: boolean;
    data?: RecentCommitsResult;
    error?: string;
}> {
    const token = getAccessToken();
    const repoConfig = getCurrentRepo();
    const count = input.count || 10;

    if (!token) {
        return { success: false, error: "Not authenticated with GitHub" };
    }

    if (!repoConfig) {
        return { success: false, error: "No repository imported. Use the Import Code button to import a GitHub repository." };
    }

    try {
        let branch = repoConfig.branch;
        if (!branch) {
            const repoResponse = await fetch(
                `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                }
            );

            if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                branch = repoData.default_branch;
            }
        }

        const response = await fetch(
            `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/commits?per_page=${count}${branch ? `&sha=${branch}` : ""}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        if (!response.ok) {
            return { success: false, error: `GitHub API error: ${response.status}` };
        }

        const data = await response.json();

        const commits: GitHubCommit[] = data.map((commit: {
            sha: string;
            commit: { message: string; author: { name: string; date: string } };
            html_url: string;
        }) => ({
            sha: commit.sha.substring(0, 7),
            message: commit.commit.message.split("\n")[0],
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            url: commit.html_url,
        }));

        return {
            success: true,
            data: {
                repo: `${repoConfig.owner}/${repoConfig.repo}`,
                branch: branch || "default",
                commits,
            },
        };
    } catch (error) {
        return { success: false, error: `Failed to fetch commits: ${error}` };
    }
}

export async function getFileContent(input: { path: string }): Promise<{
    success: boolean;
    data?: { path: string; content: string; size: number };
    error?: string;
}> {
    const token = getAccessToken();
    const repoConfig = getCurrentRepo();

    if (!token) {
        return { success: false, error: "Not authenticated with GitHub" };
    }

    if (!repoConfig) {
        return { success: false, error: "No repository imported. Use the Import Code button to import a GitHub repository." };
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${input.path}${repoConfig.branch ? `?ref=${repoConfig.branch}` : ""}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: `File not found: ${input.path}` };
            }
            return { success: false, error: `GitHub API error: ${response.status}` };
        }

        const data = await response.json();

        if (data.type !== "file") {
            return { success: false, error: `${input.path} is a ${data.type}, not a file` };
        }

        const content = atob(data.content);

        return {
            success: true,
            data: {
                path: data.path,
                content,
                size: data.size,
            },
        };
    } catch (error) {
        return { success: false, error: `Failed to fetch file: ${error}` };
    }
}

export async function listRepoContents(input: { path?: string }): Promise<{
    success: boolean;
    data?: { path: string; items: Array<{ name: string; type: "file" | "dir"; path: string; size?: number }> };
    error?: string;
}> {
    const token = getAccessToken();
    const repoConfig = getCurrentRepo();
    const path = input.path || "";

    if (!token) {
        return { success: false, error: "Not authenticated with GitHub" };
    }

    if (!repoConfig) {
        return { success: false, error: "No repository imported. Use the Import Code button to import a GitHub repository." };
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${path}${repoConfig.branch ? `?ref=${repoConfig.branch}` : ""}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: `Path not found: ${path || "/"}` };
            }
            return { success: false, error: `GitHub API error: ${response.status}` };
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            return { success: false, error: `${path} is a file, not a directory` };
        }

        const items = data.map((item: { name: string; type: string; path: string; size?: number }) => ({
            name: item.name,
            type: item.type === "dir" ? "dir" as const : "file" as const,
            path: item.path,
            size: item.size,
        }));

        return {
            success: true,
            data: {
                path: path || "/",
                items,
            },
        };
    } catch (error) {
        return { success: false, error: `Failed to list contents: ${error}` };
    }
}
