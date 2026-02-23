// ── Types ──

export interface TemplateDefinition {
  id: string
  name: string
  domain: string
  description: string
  prompt: string
  instructions: string
}

export interface DomainPack {
  id: string
  name: string
  icon: string
  templates: TemplateDefinition[]
  editPrompts: Array<{ label: string; prompt: string }>
  layoutPrompts: Array<{ label: string; prompt: string }>
}

// ── General Pack (existing 8 templates) ──

const generalPack: DomainPack = {
  id: 'general',
  name: 'General',
  icon: '📋',
  templates: [
    {
      id: 'swot',
      name: 'SWOT Analysis',
      domain: 'general',
      description: '4-quadrant strengths/weaknesses/opportunities/threats',
      prompt: 'Create a SWOT analysis template',
      instructions: `**SWOT Analysis** (4 quadrants, 2×2 grid):
- Strengths: frame at (startX, startY) 350×300 fill=#dcfce7, title "Strengths"
- Weaknesses: frame at (startX+370, startY) 350×300 fill=#fecaca, title "Weaknesses"
- Opportunities: frame at (startX, startY+320) 350×300 fill=#bfdbfe, title "Opportunities"
- Threats: frame at (startX+370, startY+320) 350×300 fill=#fef08a, title "Threats"`,
    },
    {
      id: 'kanban',
      name: 'Kanban Board',
      domain: 'general',
      description: '3-column workflow board',
      prompt: 'Create a Kanban board with To Do, In Progress, and Done columns',
      instructions: `**Kanban Board** (3-4 columns):
- To Do: frame at (startX, startY) 250×500 fill=#f1f5f9, title "To Do"
- In Progress: frame at (startX+270, startY) 250×500 fill=#fef08a, title "In Progress"
- Done: frame at (startX+540, startY) 250×500 fill=#dcfce7, title "Done"`,
    },
    {
      id: 'retrospective',
      name: 'Retrospective',
      domain: 'general',
      description: '3-column retro: Went Well, To Improve, Actions',
      prompt: 'Create a retrospective with Went Well, To Improve, and Actions',
      instructions: `**Retrospective** (3 columns):
- What went well: frame at (startX, startY) 300×400 fill=#dcfce7, title "Went Well"
- What to improve: frame at (startX+320, startY) 300×400 fill=#fecaca, title "To Improve"
- Action items: frame at (startX+640, startY) 300×400 fill=#bfdbfe, title "Actions"`,
    },
    {
      id: 'mindmap',
      name: 'Mind Map',
      domain: 'general',
      description: 'Central topic with branching ideas',
      prompt: 'Create a mind map with a central topic and 6 branching ideas',
      instructions: `**Brainstorm / Mind Map** (radial layout):
- Central topic: sticky note at (startX+300, startY+250) with the topic text
- Ideas: 6-8 sticky notes in a circle around center, radius ~250px, various colors`,
    },
    {
      id: 'flowchart',
      name: 'Flowchart',
      domain: 'general',
      description: 'Vertical flow with Start, Process, Decision, End',
      prompt: 'Create a flowchart with Start, Process, Decision, and End nodes',
      instructions: `**Flowchart** (vertical flow with connectors):
- Start: rounded_rectangle at (startX+200, startY) 150×60 fill=#dcfce7, text "Start"
- Process: rectangle at (startX+175, startY+120) 200×80 fill=#bfdbfe, text "Process"
- Decision: diamond at (startX+200, startY+260) 150×120 fill=#fef08a, text "Decision?"
- End: rounded_rectangle at (startX+200, startY+440) 150×60 fill=#fecaca, text "End"
- Connect each step to the next with arrow connectors`,
    },
    {
      id: 'timeline',
      name: 'Timeline',
      domain: 'general',
      description: 'Horizontal timeline with 5 milestones',
      prompt: 'Create a horizontal timeline with 5 milestones',
      instructions: `**Timeline** (horizontal milestones):
- 5 sticky notes at y=startY+100, spaced 200px apart starting at x=startX
- Each labeled "Milestone 1" through "Milestone 5", alternating colors
- A horizontal line connecting them at y=startY+175`,
    },
    {
      id: 'pros-cons',
      name: 'Pros & Cons',
      domain: 'general',
      description: '2-column pros and cons layout',
      prompt: 'Create a pros and cons template',
      instructions: `**Pros and Cons** (2 columns):
- Pros: frame at (startX, startY) 350×400 fill=#dcfce7, title "Pros"
- Cons: frame at (startX+370, startY) 350×400 fill=#fecaca, title "Cons"`,
    },
    {
      id: 'decision-matrix',
      name: 'Decision Matrix',
      domain: 'general',
      description: '2x2 Eisenhower matrix (Impact vs Effort)',
      prompt: 'Create a 2x2 decision matrix with Impact vs Effort axes',
      instructions: `**Decision Matrix / Eisenhower** (2×2 labeled grid):
- High Impact / Low Effort: frame at (startX, startY) 350×300 fill=#dcfce7, title "Do First"
- High Impact / High Effort: frame at (startX+370, startY) 350×300 fill=#bfdbfe, title "Schedule"
- Low Impact / Low Effort: frame at (startX, startY+320) 350×300 fill=#fef08a, title "Delegate"
- Low Impact / High Effort: frame at (startX+370, startY+320) 350×300 fill=#fecaca, title "Eliminate"`,
    },
  ],
  editPrompts: [
    { label: 'Change colors', prompt: 'I want to change the color of some objects on the board' },
    { label: 'Resize objects', prompt: 'I want to resize some objects on the board' },
    { label: 'Move objects', prompt: 'I want to move some objects on the board' },
    { label: 'Duplicate all', prompt: 'Duplicate all sticky notes and place copies next to the originals' },
    { label: 'Update text', prompt: 'I want to update the text on a sticky note' },
    { label: 'Add labels', prompt: 'Add a text label next to each shape on the board' },
    { label: 'Delete all', prompt: 'Delete all objects on the board' },
  ],
  layoutPrompts: [
    { label: 'Grid', prompt: 'Arrange all sticky notes in a neat grid' },
    { label: 'Horizontal row', prompt: 'Line up all objects in a horizontal row' },
    { label: 'Vertical column', prompt: 'Stack all objects in a vertical column' },
    { label: 'Distribute evenly', prompt: 'Distribute all objects evenly with equal spacing' },
    { label: 'Sort by color', prompt: 'Group and arrange objects by their color' },
    { label: 'Compact', prompt: 'Move all objects closer together to reduce whitespace' },
    { label: 'Summarize', prompt: 'Describe what is currently on the board' },
  ],
}

// ── Business & Strategy Pack ──

const businessPack: DomainPack = {
  id: 'business',
  name: 'Business',
  icon: '💼',
  templates: [
    {
      id: 'bmc',
      name: 'Business Model Canvas',
      domain: 'business',
      description: '9-block business model layout',
      prompt: 'Create a Business Model Canvas',
      instructions: `**Business Model Canvas** (9 blocks in classic BMC layout):
- Key Partners: frame at (startX, startY) 200×300 fill=#e0e7ff, title "Key Partners"
- Key Activities: frame at (startX+220, startY) 200×140 fill=#dbeafe, title "Key Activities"
- Key Resources: frame at (startX+220, startY+160) 200×140 fill=#dbeafe, title "Key Resources"
- Value Props: frame at (startX+440, startY) 200×300 fill=#fef08a, title "Value Propositions"
- Customer Rels: frame at (startX+660, startY) 200×140 fill=#fce7f3, title "Customer Relationships"
- Channels: frame at (startX+660, startY+160) 200×140 fill=#fce7f3, title "Channels"
- Customer Segments: frame at (startX+880, startY) 200×300 fill=#dcfce7, title "Customer Segments"
- Cost Structure: frame at (startX, startY+320) 530×180 fill=#fecaca, title "Cost Structure"
- Revenue Streams: frame at (startX+550, startY+320) 530×180 fill=#dcfce7, title "Revenue Streams"`,
    },
    {
      id: 'lean-canvas',
      name: 'Lean Canvas',
      domain: 'business',
      description: 'Lean startup validation canvas',
      prompt: 'Create a Lean Canvas for a startup idea',
      instructions: `**Lean Canvas** (9 blocks, startup-focused):
- Problem: frame at (startX, startY) 200×300 fill=#fecaca, title "Problem"
- Solution: frame at (startX+220, startY) 200×140 fill=#dcfce7, title "Solution"
- Key Metrics: frame at (startX+220, startY+160) 200×140 fill=#e0f2fe, title "Key Metrics"
- Unique Value Prop: frame at (startX+440, startY) 200×300 fill=#fef08a, title "Unique Value Proposition"
- Unfair Advantage: frame at (startX+660, startY) 200×140 fill=#f5d0fe, title "Unfair Advantage"
- Channels: frame at (startX+660, startY+160) 200×140 fill=#e0e7ff, title "Channels"
- Customer Segments: frame at (startX+880, startY) 200×300 fill=#dcfce7, title "Customer Segments"
- Cost Structure: frame at (startX, startY+320) 530×180 fill=#fed7aa, title "Cost Structure"
- Revenue Streams: frame at (startX+550, startY+320) 530×180 fill=#dcfce7, title "Revenue Streams"`,
    },
    {
      id: 'pestle',
      name: 'PESTLE Analysis',
      domain: 'business',
      description: '6-factor macro-environment analysis',
      prompt: 'Create a PESTLE analysis template',
      instructions: `**PESTLE Analysis** (6 columns):
- Political: frame at (startX, startY) 180×400 fill=#e0e7ff, title "Political"
- Economic: frame at (startX+200, startY) 180×400 fill=#dcfce7, title "Economic"
- Social: frame at (startX+400, startY) 180×400 fill=#fef08a, title "Social"
- Technological: frame at (startX+600, startY) 180×400 fill=#e0f2fe, title "Technological"
- Legal: frame at (startX+800, startY) 180×400 fill=#fed7aa, title "Legal"
- Environmental: frame at (startX+1000, startY) 180×400 fill=#bbf7d0, title "Environmental"`,
    },
    {
      id: 'porters-five-forces',
      name: "Porter's Five Forces",
      domain: 'business',
      description: 'Competitive forces analysis',
      prompt: "Create a Porter's Five Forces analysis",
      instructions: `**Porter's Five Forces** (diamond layout):
- Industry Rivalry: frame at (startX+250, startY+200) 300×200 fill=#fef08a, title "Industry Rivalry"
- Threat of New Entrants: frame at (startX+250, startY) 300×180 fill=#fecaca, title "New Entrants"
- Bargaining Power of Buyers: frame at (startX+570, startY+200) 250×200 fill=#e0e7ff, title "Buyer Power"
- Threat of Substitutes: frame at (startX+250, startY+420) 300×180 fill=#fed7aa, title "Substitutes"
- Bargaining Power of Suppliers: frame at (startX, startY+200) 230×200 fill=#dcfce7, title "Supplier Power"`,
    },
    {
      id: 'stakeholder-map',
      name: 'Stakeholder Map',
      domain: 'business',
      description: '2x2 influence vs interest grid',
      prompt: 'Create a stakeholder mapping matrix',
      instructions: `**Stakeholder Map** (2×2 grid: Power vs Interest):
- High Power / High Interest: frame at (startX+370, startY) 350×300 fill=#fecaca, title "Manage Closely"
- High Power / Low Interest: frame at (startX, startY) 350×300 fill=#fef08a, title "Keep Satisfied"
- Low Power / High Interest: frame at (startX+370, startY+320) 350×300 fill=#dcfce7, title "Keep Informed"
- Low Power / Low Interest: frame at (startX, startY+320) 350×300 fill=#f1f5f9, title "Monitor"`,
    },
    {
      id: 'competitive-analysis',
      name: 'Competitive Analysis',
      domain: 'business',
      description: 'Compare competitors across dimensions',
      prompt: 'Create a competitive analysis template with 4 competitors',
      instructions: `**Competitive Analysis** (5 columns: You + 4 competitors):
- Your Company: frame at (startX, startY) 200×500 fill=#dcfce7, title "Your Company"
- Competitor 1: frame at (startX+220, startY) 200×500 fill=#e0e7ff, title "Competitor 1"
- Competitor 2: frame at (startX+440, startY) 200×500 fill=#fef08a, title "Competitor 2"
- Competitor 3: frame at (startX+660, startY) 200×500 fill=#fce7f3, title "Competitor 3"
- Competitor 4: frame at (startX+880, startY) 200×500 fill=#fed7aa, title "Competitor 4"
- Add sticky notes in each for: Strengths, Pricing, Target Market, Key Features`,
    },
    {
      id: 'okr-board',
      name: 'OKR Board',
      domain: 'business',
      description: 'Objectives and Key Results tracker',
      prompt: 'Create an OKR board with 3 objectives',
      instructions: `**OKR Board** (3 objective rows):
- Objective 1: frame at (startX, startY) 250×200 fill=#e0e7ff, title "Objective 1"
- KR 1.1-1.3: 3 sticky notes to the right at (startX+270, startY), (startX+270, startY+60), (startX+270, startY+120) fill=#dcfce7
- Objective 2: frame at (startX, startY+220) 250×200 fill=#fef08a, title "Objective 2"
- KR 2.1-2.3: 3 sticky notes to the right at (startX+270, startY+220), etc. fill=#fef08a
- Objective 3: frame at (startX, startY+440) 250×200 fill=#fce7f3, title "Objective 3"
- KR 3.1-3.3: 3 sticky notes to the right fill=#fce7f3`,
    },
  ],
  editPrompts: [
    { label: 'Fill a section', prompt: 'Add sticky notes with ideas to a specific section of my canvas' },
    { label: 'Update labels', prompt: 'Change the labels on the template sections' },
    { label: 'Add competitor', prompt: 'Add another competitor column to the analysis' },
    { label: 'Highlight key items', prompt: 'Change the color of the most important items to red' },
  ],
  layoutPrompts: [
    { label: 'Tighten layout', prompt: 'Reduce spacing between all frames to make the layout more compact' },
    { label: 'Add headings', prompt: 'Add a large title heading above the template' },
    { label: 'Summarize', prompt: 'Describe what is currently on the board' },
  ],
}

// ── Product & UX Pack ──

const productPack: DomainPack = {
  id: 'product',
  name: 'Product & UX',
  icon: '🎯',
  templates: [
    {
      id: 'user-journey',
      name: 'User Journey Map',
      domain: 'product',
      description: 'Map the user experience across stages',
      prompt: 'Create a user journey map with 5 stages',
      instructions: `**User Journey Map** (5-stage horizontal flow):
- Awareness: frame at (startX, startY) 220×400 fill=#e0e7ff, title "Awareness"
- Consideration: frame at (startX+240, startY) 220×400 fill=#dbeafe, title "Consideration"
- Decision: frame at (startX+480, startY) 220×400 fill=#fef08a, title "Decision"
- Onboarding: frame at (startX+720, startY) 220×400 fill=#dcfce7, title "Onboarding"
- Retention: frame at (startX+960, startY) 220×400 fill=#bbf7d0, title "Retention"
- Add rows of sticky notes in each for: Actions, Thoughts, Emotions, Pain Points, Opportunities`,
    },
    {
      id: 'empathy-map',
      name: 'Empathy Map',
      domain: 'product',
      description: '4-quadrant user empathy canvas',
      prompt: 'Create an empathy map template',
      instructions: `**Empathy Map** (4 quadrants + center):
- Says: frame at (startX, startY) 350×250 fill=#e0e7ff, title "Says"
- Thinks: frame at (startX+370, startY) 350×250 fill=#dcfce7, title "Thinks"
- Does: frame at (startX, startY+270) 350×250 fill=#fef08a, title "Does"
- Feels: frame at (startX+370, startY+270) 350×250 fill=#fce7f3, title "Feels"
- Center: sticky note at (startX+280, startY+210) fill=#f1f5f9, text "User Persona"`,
    },
    {
      id: 'rice-prioritization',
      name: 'RICE Prioritization',
      domain: 'product',
      description: 'Score features by Reach, Impact, Confidence, Effort',
      prompt: 'Create a RICE prioritization board for feature ideas',
      instructions: `**RICE Prioritization** (table-like layout):
- Header row: 5 text labels at y=startY: "Feature" at startX, "Reach" at startX+250, "Impact" at startX+380, "Confidence" at startX+510, "Effort" at startX+640
- Feature rows: 4 horizontal rows of sticky notes below, each 150×60 spaced 80px apart starting at startY+40
- RICE Score: text label at (startX+770, startY) "Score"
- Add 4 example feature sticky notes in the first column with placeholder text`,
    },
    {
      id: 'user-story-map',
      name: 'User Story Map',
      domain: 'product',
      description: 'Map user activities to stories and releases',
      prompt: 'Create a user story map template',
      instructions: `**User Story Map** (horizontal activities, vertical story slices):
- Activities row: 4 sticky notes at y=startY, spaced 200px apart, fill=#e0e7ff, text "Activity 1-4"
- Tasks row: 4 sticky notes at y=startY+100, same x positions, fill=#fef08a, text "Task 1-4"
- Release 1 line: horizontal line at y=startY+200 spanning full width
- Release 1 stories: 4 sticky notes at y=startY+220, fill=#dcfce7, text "Story 1-4"
- Release 2 line: horizontal line at y=startY+400 spanning full width
- Release 2 stories: 4 sticky notes at y=startY+420, fill=#fce7f3, text "Story 5-8"`,
    },
    {
      id: 'sprint-planning',
      name: 'Sprint Planning',
      domain: 'product',
      description: 'Sprint goal, backlog, and task board',
      prompt: 'Create a sprint planning board',
      instructions: `**Sprint Planning Board** (goal + columns):
- Sprint Goal: frame at (startX, startY) 800×100 fill=#e0e7ff, title "Sprint Goal"
- Backlog: frame at (startX, startY+120) 250×400 fill=#f1f5f9, title "Backlog"
- In Progress: frame at (startX+270, startY+120) 250×400 fill=#fef08a, title "In Progress"
- Done: frame at (startX+540, startY+120) 250×400 fill=#dcfce7, title "Done"`,
    },
    {
      id: 'design-critique',
      name: 'Design Critique',
      domain: 'product',
      description: 'Structured design feedback board',
      prompt: 'Create a design critique template',
      instructions: `**Design Critique** (3 feedback columns):
- What works: frame at (startX, startY) 300×400 fill=#dcfce7, title "What Works"
- Questions: frame at (startX+320, startY) 300×400 fill=#fef08a, title "Questions"
- Suggestions: frame at (startX+640, startY) 300×400 fill=#e0e7ff, title "Suggestions"`,
    },
  ],
  editPrompts: [
    { label: 'Add user stories', prompt: 'Add sample user stories to the story map' },
    { label: 'Fill personas', prompt: 'Add persona details to the empathy map' },
    { label: 'Score features', prompt: 'Add RICE scores to the feature cards' },
    { label: 'Add pain points', prompt: 'Add pain points to the user journey map' },
  ],
  layoutPrompts: [
    { label: 'Prioritize', prompt: 'Rearrange items by priority (highest at top)' },
    { label: 'Add headings', prompt: 'Add a large title heading above the template' },
    { label: 'Summarize', prompt: 'Describe what is currently on the board' },
  ],
}

// ── Engineering Pack ──

const engineeringPack: DomainPack = {
  id: 'engineering',
  name: 'Engineering',
  icon: '⚙️',
  templates: [
    {
      id: 'system-architecture',
      name: 'System Architecture',
      domain: 'engineering',
      description: 'High-level system components and connections',
      prompt: 'Create a system architecture diagram template',
      instructions: `**System Architecture** (layered diagram):
- Client Layer: frame at (startX, startY) 700×150 fill=#e0e7ff, title "Client Layer"
- Add sticky notes inside: "Web App", "Mobile App", "Admin Panel"
- API Layer: frame at (startX, startY+170) 700×150 fill=#fef08a, title "API / Gateway"
- Add sticky notes inside: "REST API", "Auth", "Rate Limiter"
- Service Layer: frame at (startX, startY+340) 700×150 fill=#dcfce7, title "Services"
- Add sticky notes inside: "User Service", "Order Service", "Notification Service"
- Data Layer: frame at (startX, startY+510) 700×150 fill=#fecaca, title "Data Layer"
- Add sticky notes inside: "PostgreSQL", "Redis Cache", "S3 Storage"
- Connect layers with vertical arrow connectors`,
    },
    {
      id: 'er-diagram',
      name: 'ER Diagram',
      domain: 'engineering',
      description: 'Entity-relationship database diagram',
      prompt: 'Create an entity-relationship diagram template',
      instructions: `**ER Diagram** (entity boxes with relationships):
- Users: frame at (startX, startY) 200×200 fill=#e0e7ff, title "Users"
- Add sticky notes: "id (PK)", "email", "name", "created_at"
- Orders: frame at (startX+300, startY) 200×200 fill=#dcfce7, title "Orders"
- Add sticky notes: "id (PK)", "user_id (FK)", "total", "status"
- Products: frame at (startX+600, startY) 200×200 fill=#fef08a, title "Products"
- Add sticky notes: "id (PK)", "name", "price", "stock"
- Connect Users→Orders and Orders→Products with arrow connectors`,
    },
    {
      id: 'api-design',
      name: 'API Design',
      domain: 'engineering',
      description: 'REST API endpoint planning board',
      prompt: 'Create an API design template',
      instructions: `**API Design** (method groups):
- GET Endpoints: frame at (startX, startY) 300×300 fill=#dcfce7, title "GET"
- POST Endpoints: frame at (startX+320, startY) 300×300 fill=#e0e7ff, title "POST"
- PUT/PATCH Endpoints: frame at (startX+640, startY) 300×300 fill=#fef08a, title "PUT/PATCH"
- DELETE Endpoints: frame at (startX+960, startY) 300×300 fill=#fecaca, title "DELETE"
- Add example sticky notes in each with placeholder endpoint paths`,
    },
    {
      id: 'incident-postmortem',
      name: 'Incident Postmortem',
      domain: 'engineering',
      description: 'Post-incident review template',
      prompt: 'Create an incident postmortem template',
      instructions: `**Incident Postmortem** (structured review):
- Summary: frame at (startX, startY) 740×150 fill=#fecaca, title "Incident Summary"
- Timeline: frame at (startX, startY+170) 740×200 fill=#fef08a, title "Timeline of Events"
- Root Cause: frame at (startX, startY+390) 360×200 fill=#e0e7ff, title "Root Cause"
- Impact: frame at (startX+380, startY+390) 360×200 fill=#fed7aa, title "Impact"
- Action Items: frame at (startX, startY+610) 740×200 fill=#dcfce7, title "Action Items"`,
    },
    {
      id: 'tech-decision',
      name: 'Technical Decision Record',
      domain: 'engineering',
      description: 'ADR-style decision documentation',
      prompt: 'Create a technical decision record template',
      instructions: `**Technical Decision Record** (ADR layout):
- Context: frame at (startX, startY) 740×150 fill=#e0f2fe, title "Context"
- Options: frame at (startX, startY+170) 740×200 fill=#fef08a, title "Options Considered"
- Decision: frame at (startX, startY+390) 740×150 fill=#dcfce7, title "Decision"
- Consequences: frame at (startX, startY+560) 360×180 fill=#bbf7d0, title "Pros"
- Risks: frame at (startX+380, startY+560) 360×180 fill=#fecaca, title "Cons / Risks"`,
    },
    {
      id: 'sprint-board-eng',
      name: 'Sprint Board',
      domain: 'engineering',
      description: 'Engineering sprint with review and deploy columns',
      prompt: 'Create an engineering sprint board',
      instructions: `**Engineering Sprint Board** (5 columns):
- Backlog: frame at (startX, startY) 200×500 fill=#f1f5f9, title "Backlog"
- In Progress: frame at (startX+220, startY) 200×500 fill=#fef08a, title "In Progress"
- In Review: frame at (startX+440, startY) 200×500 fill=#e0e7ff, title "In Review"
- QA: frame at (startX+660, startY) 200×500 fill=#fce7f3, title "QA"
- Done: frame at (startX+880, startY) 200×500 fill=#dcfce7, title "Done"`,
    },
  ],
  editPrompts: [
    { label: 'Add service', prompt: 'Add a new service component to the architecture diagram' },
    { label: 'Add entity', prompt: 'Add a new entity to the ER diagram' },
    { label: 'Add endpoint', prompt: 'Add a new API endpoint' },
    { label: 'Connect components', prompt: 'Add connectors between components' },
  ],
  layoutPrompts: [
    { label: 'Align layers', prompt: 'Align all layers horizontally with consistent spacing' },
    { label: 'Add headings', prompt: 'Add a large title heading above the diagram' },
    { label: 'Summarize', prompt: 'Describe what is currently on the board' },
  ],
}

// ── Education Pack ──

const educationPack: DomainPack = {
  id: 'education',
  name: 'Education',
  icon: '📚',
  templates: [
    {
      id: 'lesson-plan',
      name: 'Lesson Plan',
      domain: 'education',
      description: 'Structured lesson with objectives, activities, assessment',
      prompt: 'Create a lesson plan template',
      instructions: `**Lesson Plan** (structured rows):
- Learning Objectives: frame at (startX, startY) 740×150 fill=#e0e7ff, title "Learning Objectives"
- Introduction: frame at (startX, startY+170) 360×200 fill=#dcfce7, title "Introduction (10 min)"
- Main Activity: frame at (startX+380, startY+170) 360×200 fill=#fef08a, title "Main Activity (30 min)"
- Practice: frame at (startX, startY+390) 360×200 fill=#fce7f3, title "Guided Practice (15 min)"
- Assessment: frame at (startX+380, startY+390) 360×200 fill=#fed7aa, title "Assessment"
- Resources: frame at (startX, startY+610) 740×150 fill=#f1f5f9, title "Materials & Resources"`,
    },
    {
      id: 'concept-map',
      name: 'Concept Map',
      domain: 'education',
      description: 'Hierarchical concept relationships',
      prompt: 'Create a concept map template with a main concept and sub-topics',
      instructions: `**Concept Map** (hierarchical):
- Main Concept: sticky note at (startX+300, startY) 200×100 fill=#e0e7ff, text "Main Concept"
- Sub-Topic 1: sticky note at (startX+50, startY+180) fill=#dcfce7, text "Sub-Topic 1"
- Sub-Topic 2: sticky note at (startX+300, startY+180) fill=#fef08a, text "Sub-Topic 2"
- Sub-Topic 3: sticky note at (startX+550, startY+180) fill=#fce7f3, text "Sub-Topic 3"
- Detail 1a: sticky note at (startX, startY+360) fill=#f1f5f9, text "Detail 1a"
- Detail 1b: sticky note at (startX+100, startY+360) fill=#f1f5f9, text "Detail 1b"
- Detail 2a: sticky note at (startX+300, startY+360) fill=#f1f5f9, text "Detail 2a"
- Detail 3a: sticky note at (startX+500, startY+360) fill=#f1f5f9, text "Detail 3a"
- Detail 3b: sticky note at (startX+600, startY+360) fill=#f1f5f9, text "Detail 3b"
- Connect main→sub-topics and sub-topics→details with connectors`,
    },
    {
      id: 'study-guide',
      name: 'Study Guide',
      domain: 'education',
      description: 'Organized study topics with key points',
      prompt: 'Create a study guide template with 4 topics',
      instructions: `**Study Guide** (topic sections):
- Topic 1: frame at (startX, startY) 350×250 fill=#e0e7ff, title "Topic 1"
- Topic 2: frame at (startX+370, startY) 350×250 fill=#dcfce7, title "Topic 2"
- Topic 3: frame at (startX, startY+270) 350×250 fill=#fef08a, title "Topic 3"
- Topic 4: frame at (startX+370, startY+270) 350×250 fill=#fce7f3, title "Topic 4"
- Add sticky notes in each with "Key Point 1", "Key Point 2", "Key Point 3"`,
    },
    {
      id: 'rubric-builder',
      name: 'Rubric Builder',
      domain: 'education',
      description: 'Assessment criteria grid',
      prompt: 'Create a rubric builder template',
      instructions: `**Rubric Builder** (criteria × performance grid):
- Header row: text labels at y=startY: "Criteria" at startX, "Excellent" at startX+200, "Good" at startX+400, "Needs Work" at startX+600
- Criteria 1: frame at (startX, startY+50) 180×100 fill=#e0e7ff, title "Criteria 1"
- Excellent 1: frame at (startX+200, startY+50) 180×100 fill=#dcfce7
- Good 1: frame at (startX+400, startY+50) 180×100 fill=#fef08a
- Needs Work 1: frame at (startX+600, startY+50) 180×100 fill=#fecaca
- Repeat for Criteria 2 at startY+170 and Criteria 3 at startY+290`,
    },
    {
      id: 'kwl-chart',
      name: 'KWL Chart',
      domain: 'education',
      description: 'Know, Want to Know, Learned columns',
      prompt: 'Create a KWL chart template',
      instructions: `**KWL Chart** (3 columns):
- Know: frame at (startX, startY) 300×400 fill=#dcfce7, title "What I Know"
- Want to Know: frame at (startX+320, startY) 300×400 fill=#fef08a, title "Want to Know"
- Learned: frame at (startX+640, startY) 300×400 fill=#e0e7ff, title "What I Learned"`,
    },
  ],
  editPrompts: [
    { label: 'Add objectives', prompt: 'Add learning objectives to the lesson plan' },
    { label: 'Fill rubric', prompt: 'Add descriptions to each rubric cell' },
    { label: 'Add topics', prompt: 'Add more sub-topics to the concept map' },
    { label: 'Add key terms', prompt: 'Add vocabulary terms as sticky notes' },
  ],
  layoutPrompts: [
    { label: 'Color by level', prompt: 'Color-code items by difficulty level' },
    { label: 'Add headings', prompt: 'Add a large title heading above the template' },
    { label: 'Summarize', prompt: 'Describe what is currently on the board' },
  ],
}

// ── Science Pack ──

const sciencePack: DomainPack = {
  id: 'science',
  name: 'Science',
  icon: '🔬',
  templates: [
    {
      id: 'experiment-planning',
      name: 'Experiment Planning',
      domain: 'science',
      description: 'Hypothesis, variables, method, results structure',
      prompt: 'Create an experiment planning template',
      instructions: `**Experiment Planning** (structured layout):
- Hypothesis: frame at (startX, startY) 740×120 fill=#e0e7ff, title "Hypothesis"
- Variables: frame at (startX, startY+140) 240×200 fill=#dcfce7, title "Variables"
- Add sticky notes: "Independent", "Dependent", "Controlled"
- Method: frame at (startX+260, startY+140) 480×200 fill=#fef08a, title "Method / Procedure"
- Materials: frame at (startX, startY+360) 360×180 fill=#f1f5f9, title "Materials"
- Expected Results: frame at (startX+380, startY+360) 360×180 fill=#fce7f3, title "Expected Results"
- Observations: frame at (startX, startY+560) 740×200 fill=#fed7aa, title "Observations & Data"`,
    },
    {
      id: 'lab-report',
      name: 'Lab Report Layout',
      domain: 'science',
      description: 'Standard lab report sections',
      prompt: 'Create a lab report template',
      instructions: `**Lab Report** (sequential sections):
- Title: frame at (startX, startY) 740×80 fill=#e0e7ff, title "Title & Date"
- Objective: frame at (startX, startY+100) 740×120 fill=#dbeafe, title "Objective"
- Materials: frame at (startX, startY+240) 360×180 fill=#f1f5f9, title "Materials"
- Procedure: frame at (startX+380, startY+240) 360×180 fill=#fef08a, title "Procedure"
- Data: frame at (startX, startY+440) 740×200 fill=#dcfce7, title "Data & Observations"
- Analysis: frame at (startX, startY+660) 360×180 fill=#fed7aa, title "Analysis"
- Conclusion: frame at (startX+380, startY+660) 360×180 fill=#e0e7ff, title "Conclusion"`,
    },
    {
      id: 'hypothesis-board',
      name: 'Hypothesis Board',
      domain: 'science',
      description: 'Test multiple hypotheses with evidence',
      prompt: 'Create a hypothesis testing board',
      instructions: `**Hypothesis Board** (hypothesis rows with evidence):
- Hypothesis 1: frame at (startX, startY) 250×200 fill=#e0e7ff, title "Hypothesis 1"
- Evidence For 1: frame at (startX+270, startY) 220×200 fill=#dcfce7, title "Evidence For"
- Evidence Against 1: frame at (startX+510, startY) 220×200 fill=#fecaca, title "Evidence Against"
- Hypothesis 2: frame at (startX, startY+220) 250×200 fill=#fef08a, title "Hypothesis 2"
- Evidence For 2: frame at (startX+270, startY+220) 220×200 fill=#dcfce7, title "Evidence For"
- Evidence Against 2: frame at (startX+510, startY+220) 220×200 fill=#fecaca, title "Evidence Against"
- Conclusion: frame at (startX, startY+440) 730×150 fill=#bbf7d0, title "Conclusion"`,
    },
    {
      id: 'research-poster',
      name: 'Research Poster',
      domain: 'science',
      description: 'Academic poster layout',
      prompt: 'Create a research poster template',
      instructions: `**Research Poster** (academic layout):
- Title: frame at (startX, startY) 1000×80 fill=#e0e7ff, title "Research Title"
- Abstract: frame at (startX, startY+100) 320×250 fill=#dbeafe, title "Abstract"
- Introduction: frame at (startX+340, startY+100) 320×250 fill=#f1f5f9, title "Introduction"
- Methods: frame at (startX+680, startY+100) 320×250 fill=#fef08a, title "Methods"
- Results: frame at (startX, startY+370) 490×250 fill=#dcfce7, title "Results"
- Discussion: frame at (startX+510, startY+370) 490×250 fill=#fce7f3, title "Discussion"
- References: frame at (startX, startY+640) 1000×120 fill=#f1f5f9, title "References"`,
    },
  ],
  editPrompts: [
    { label: 'Add data', prompt: 'Add data points or observations to the experiment' },
    { label: 'Add variables', prompt: 'Add more variables to the experiment plan' },
    { label: 'Fill sections', prompt: 'Add content to the empty report sections' },
    { label: 'Add citations', prompt: 'Add reference citations as sticky notes' },
  ],
  layoutPrompts: [
    { label: 'Number steps', prompt: 'Add numbered labels to the procedure steps' },
    { label: 'Add headings', prompt: 'Add a large title heading above the template' },
    { label: 'Summarize', prompt: 'Describe what is currently on the board' },
  ],
}

// ── Registry ──

const DOMAIN_PACKS: DomainPack[] = [
  generalPack,
  businessPack,
  productPack,
  engineeringPack,
  educationPack,
  sciencePack,
]

export function getAllDomains(): DomainPack[] {
  return DOMAIN_PACKS
}

export function getDomainPack(domainId: string): DomainPack | undefined {
  return DOMAIN_PACKS.find((d) => d.id === domainId)
}

export function getTemplateInstructions(domainId: string): string {
  const pack = getDomainPack(domainId)
  if (!pack) return ''
  return pack.templates.map((t) => t.instructions).join('\n\n')
}

export function getAllTemplateNames(): string[] {
  return DOMAIN_PACKS.flatMap((d) => d.templates.map((t) => t.name.toLowerCase()))
}
