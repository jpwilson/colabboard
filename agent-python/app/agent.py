"""LangChain agent executor setup."""

from __future__ import annotations

from typing import Any

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.system_prompt import build_system_prompt
from app.tools import make_tools


def create_agent(
    board_id: str,
    verbose: bool,
    model_name: str,
    supabase_client: Any,
) -> AgentExecutor:
    """Create a LangChain AgentExecutor bound to a specific board."""
    llm = ChatAnthropic(model=model_name, max_tokens=4096)

    system = build_system_prompt(board_id, verbose)
    prompt = ChatPromptTemplate.from_messages([
        ("system", system),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    tools = make_tools(board_id, supabase_client)
    agent = create_tool_calling_agent(llm, tools, prompt)

    return AgentExecutor(
        agent=agent,
        tools=tools,
        max_iterations=10,  # matches TS stepCountIs(10)
        return_intermediate_steps=True,
    )
