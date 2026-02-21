export type ObjectType = 'sticky_note' | 'rectangle' | 'circle' | 'line' | 'text' | 'frame' | 'connector'

export type UserRole = 'owner' | 'editor' | 'viewer'

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export type AgentBackend = 'nextjs' | 'docker'

export interface AppConfig {
  agent_backend: AgentBackend
  agent_model: string
}

export interface Board {
  id: string
  slug: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface BoardMember {
  id: string
  board_id: string
  user_id: string
  role: UserRole
  status: InvitationStatus
  invited_at: string
  invited_by: string | null
  message: string | null
}

export interface BoardObject {
  id: string
  board_id: string
  type: ObjectType
  data: Record<string, unknown>
  x: number
  y: number
  width: number
  height: number
  z_index: number
  created_by: string
  updated_at: string
}

export interface CursorPosition {
  user_id: string
  user_name: string
  x: number
  y: number
  color: string
}
