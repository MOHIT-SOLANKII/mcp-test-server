#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk";
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "github-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

interface CreateRepoParams {
  name: string;
  description?: string;
  private?: boolean;
}

// Register GitHub repository creation tool
server.tool(
  "create-repository",
  "Create a new GitHub repository",
  {
    name: z.string().describe("Repository name"),
    description: z.string().optional().describe("Repository description"),
    private: z.boolean().optional().describe("Whether the repository should be private"),
  },
  async ({ name, description, private: isPrivate }: CreateRepoParams) => {
    try {
      const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      
      if (!token) {
        return {
          content: [
            {
              type: "text",
              text: "GitHub Personal Access Token is not configured. Please set the GITHUB_PERSONAL_ACCESS_TOKEN environment variable.",
            },
          ],
        };
      }
      
      const response = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description: description || "",
          private: isPrivate || false,
          auto_init: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `Failed to create repository: ${error}`,
            },
          ],
        };
      }
      
      const repo = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Successfully created repository: ${repo.html_url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating repository: ${error}`,
          },
        ],
      };
    }
  }
);

// Run the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});