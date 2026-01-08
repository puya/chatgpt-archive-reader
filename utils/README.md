# ChatGPT Archive Analysis Utilities

This folder contains utility tools for analyzing ChatGPT conversation archive data.

## 📊 Archive Metadata Analyzer

`analyze_chatgpt_archive.py` - Interactive command-line tool for ChatGPT JSON archives

### Features

- **Complete Metadata Extraction**: Discovers all available fields and data structures
- **Project Analysis**: Identifies and analyzes project groupings (`gizmo_id`)
- **User Information**: Extracts user profiles, memory data, and personal settings
- **Content Statistics**: Analyzes message patterns, models used, and content types
- **Memory & Context**: Examines memory scopes, context limitations, and user preferences
- **Security Data**: Reviews access controls, moderation results, and restrictions
- **Interactive CLI**: Multiple commands for different analysis types
- **Export Capabilities**: Export data in JSON, CSV, or text formats

### Usage

#### Executable CLI Tool

The tool can be run directly without the `python` prefix:

```bash
# Make executable (first time only)
chmod +x utils/analyze_chatgpt_archive

# Show help
./utils/analyze_chatgpt_archive --help

# Full analysis of default file (../data/conversations.json)
./utils/analyze_chatgpt_archive analyze

# Analyze specific file
./utils/analyze_chatgpt_archive --file /path/to/conversations.json analyze
```

#### Python Script (Alternative)

```bash
# Show help
python analyze_chatgpt_archive.py --help

# Full analysis of default file (../data/conversations.json)
python analyze_chatgpt_archive.py analyze

# Analyze specific file
python analyze_chatgpt_archive.py --file /path/to/conversations.json analyze

# Interactive commands
python analyze_chatgpt_archive.py [command] [options]
```

#### Available Commands

##### 🔍 `analyze` - Complete archive analysis
```bash
python analyze_chatgpt_archive.py analyze --output report.txt
```

##### 📋 `fields` - Examine metadata fields
```bash
# List all fields
python analyze_chatgpt_archive.py fields

# Show only project-related fields
python analyze_chatgpt_archive.py fields --category projects

# Show sample values for each field
python analyze_chatgpt_archive.py fields --values
```

##### 🏗️ `projects` - Analyze project structure
```bash
# Overview of all projects
python analyze_chatgpt_archive.py projects

# Show only project names
python analyze_chatgpt_archive.py projects --names-only

# Detailed project information
python analyze_chatgpt_archive.py projects --detailed

# Focus on specific project
python analyze_chatgpt_archive.py projects --id g-p-67f6f442bec08191b02fdd71c03312b1
```

##### 💬 `conversations` - Extract conversation data
```bash
# List conversations (first 10)
python analyze_chatgpt_archive.py conversations

# Find specific conversation
python analyze_chatgpt_archive.py conversations --id 695c5ef9-e248-832f-ae68-4f15ba2a84fc

# Show conversations in a project
python analyze_chatgpt_archive.py conversations --project g-p-67f6f442bec08191b02fdd71c03312b1

# Show more results
python analyze_chatgpt_archive.py conversations --limit 50

# Different output formats
python analyze_chatgpt_archive.py conversations --format messages
```

##### 🔎 `search` - Search conversations
```bash
# Search by title
python analyze_chatgpt_archive.py search --title "project"

# Search in message content
python analyze_chatgpt_archive.py search --content "python"

# Combine filters
python analyze_chatgpt_archive.py search --project g-p-67f6f442bec08191b02fdd71c03312b1 --model gpt-5-2
```

##### 📊 `stats` - Show statistics
```bash
# General statistics
python analyze_chatgpt_archive.py stats

# AI model usage
python analyze_chatgpt_archive.py stats --model-usage

# Conversation timeline
python analyze_chatgpt_archive.py stats --timeline

# Project statistics
python analyze_chatgpt_archive.py stats --projects
```

##### 💾 `export` - Export data
```bash
# Export conversations as JSON
python analyze_chatgpt_archive.py export --type conversations --format json --output conversations.json

# Export project data as CSV
python analyze_chatgpt_archive.py export --type projects --format csv --output projects.csv

# Export field metadata
python analyze_chatgpt_archive.py export --type fields --format txt --output fields.txt
```

### What It Analyzes

#### 🔍 Metadata Fields
- Conversation structure and identifiers
- Project associations (`gizmo_id`, `gizmo_type`)
- Model configurations and settings
- Memory and context management
- Security and access controls
- User interface preferences

#### 🏗️ Project Data
- Project groupings and hierarchies
- Gizmo types and templates
- Conversation clustering
- Project naming attempts

#### 👤 User Information
- User profiles and preferences
- Memory scopes and exclusions
- Context limitations
- Personal settings and data

#### 📊 Content Analysis
- Message statistics and patterns
- AI model usage tracking
- Content types and formats
- Temporal analysis (creation dates)

### Sample Output

```
🎯 CHATGPT ARCHIVE ANALYSIS REPORT
================================================================================

📁 File: conversations.json
📊 Total conversations: 2156
🏷️ Conversations with projects: 323
📋 Standalone conversations: 1833
📂 Unique projects: 53

🔍 ALL METADATA FIELDS DISCOVERED:
----------------------------------------
 1. async_status: null
 2. blocked_urls: list[0]
 3. context_scopes: null
 4. conversation_id: 695c5ef9-e248-832f-ae68-4f15ba2a84fc
 5. conversation_template_id: g-p-695c5d2ac4f481918ad844d64d343add
 6. create_time: 1767661306.399968
 7. current_node: a49c1d39-3ad5-4b22-97fe-1b5b78b5f84a
 8. default_model_slug: gpt-5-2
 9. disabled_tool_ids: list[0]
10. gizmo_id: g-p-695c5d2ac4f481918ad844d64d343add
11. gizmo_type: snorlax
12. id: 695c5ef9-e248-832f-ae68-4f15ba2a84fc
13. is_archived: False
14. is_do_not_remember: False
15. is_read_only: null
16. is_starred: null
17. is_study_mode: False
18. mapping: dict[variable]
19. memory_scope: global_enabled
20. moderation_results: list[1]
21. owner: null
22. pinned_time: null
23. plugin_ids: null
24. safe_urls: list[0]
25. sugar_item_id: null
26. sugar_item_visible: False
27. title: Revised opening suggestion
28. update_time: 1767808601.657723
29. voice: null

🏗️ PROJECT ANALYSIS:
----------------------------------------
Total projects found: 53
• g-p-67f6f442bec08191b02fdd71c03312b1: 80 conversations
  └─ Sample: Image to Video Prompt
• g-p-6925fa9c9fe08191a93b6f76604c4da9: 29 conversations
  └─ Sample: Thai alphabet explanation
• g-p-686cb310018481919666871c42934416: 28 conversations
  └─ Sample: Adjust CV for Micheal

💾 MEMORY & USER DATA FIELDS:
----------------------------------------
• memory_scope: global_enabled
• is_do_not_remember: False
• context_scopes: null
• sugar_item_id: null
• owner: null

🔐 SECURITY & ACCESS FIELDS:
----------------------------------------
• safe_urls: present in 2156 conversations
• blocked_urls: present in 2156 conversations
• disabled_tool_ids: present in 2156 conversations
• moderation_results: present in 2156 conversations
```

### Dependencies

```bash
pip install -r requirements.txt
```

Contents of `requirements.txt`:
```
# No external dependencies required (uses only Python standard library)
```
