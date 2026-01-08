#!/usr/bin/env python3
#!/usr/bin/env python3
"""
ChatGPT Archive Metadata Analyzer

A comprehensive command-line utility for analyzing ChatGPT conversation archives.

Usage: python analyze_chatgpt_archive.py [command] [options]

Commands:
  analyze     - Full analysis of archive
  fields      - List all metadata fields
  projects    - Analyze project structure
  conversations - Extract specific conversations
  search      - Search conversations by criteria
  stats       - Show statistics
  export      - Export data to various formats
"""

import json
import sys
import os
import re
from collections import defaultdict, Counter
from datetime import datetime
import argparse

class ChatGPTArchiveAnalyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.data = None
        self.metadata_fields = set()
        self.field_values = defaultdict(set)
        self.field_counts = defaultdict(int)
        self.projects = {}
        self.user_info = {}
        self.memory_data = []
        self.content_stats = defaultdict(int)

    def load_data(self):
        """Load and parse the JSON file"""
        print(f"Loading {self.file_path}...")
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            print(f"✅ Loaded {len(self.data)} conversations")
        except Exception as e:
            print(f"❌ Error loading file: {e}")
            sys.exit(1)

    def analyze_metadata_fields(self):
        """Extract all metadata fields from conversations"""
        print("\n🔍 Analyzing metadata fields...")

        for i, conv in enumerate(self.data):
            # Skip if conversation is None or doesn't have expected structure
            if not isinstance(conv, dict):
                continue

            # Collect all top-level fields
            for field, value in conv.items():
                self.metadata_fields.add(field)
                self.field_counts[field] += 1

                # Store sample values (limit to avoid memory issues)
                if len(self.field_values[field]) < 10:  # Only keep 10 sample values per field
                    if isinstance(value, (str, int, float, bool)):
                        self.field_values[field].add(str(value))
                    elif isinstance(value, list):
                        self.field_values[field].add(f"list[{len(value)}]")
                    elif isinstance(value, dict):
                        self.field_values[field].add(f"dict[{len(value)} keys]")
                    else:
                        self.field_values[field].add(f"{type(value).__name__}")

        print(f"📊 Found {len(self.metadata_fields)} metadata fields")

    def analyze_projects_and_gizmos(self):
        """Analyze project/gizmo data"""
        print("\n🏗️ Analyzing projects and gizmos...")

        gizmo_types = Counter()
        gizmo_ids = set()
        template_ids = set()

        for conv in self.data:
            if not isinstance(conv, dict):
                continue

            # Analyze gizmo data
            gizmo_id = conv.get('gizmo_id')
            gizmo_type = conv.get('gizmo_type')
            template_id = conv.get('conversation_template_id')

            if gizmo_id:
                gizmo_ids.add(gizmo_id)
            if gizmo_type:
                gizmo_types[gizmo_type] += 1
            if template_id:
                template_ids.add(template_id)

            # Group conversations by gizmo_id
            if gizmo_id:
                if gizmo_id not in self.projects:
                    self.projects[gizmo_id] = {
                        'type': gizmo_type,
                        'template_id': template_id,
                        'conversations': [],
                        'titles': set()
                    }
                self.projects[gizmo_id]['conversations'].append(conv)
                if conv.get('title'):
                    self.projects[gizmo_id]['titles'].add(conv['title'])

        print(f"📁 Found {len(gizmo_ids)} unique gizmo IDs")
        print(f"🏷️ Gizmo types: {dict(gizmo_types)}")
        print(f"📋 Template IDs: {len(template_ids)} unique")

        # Try to find actual project names
        print("\n🔍 Attempting to extract project names...")
        for gizmo_id, project_data in self.projects.items():
            possible_names = self.extract_project_name(gizmo_id, project_data)
            if possible_names:
                print(f"  {gizmo_id}: {possible_names}")

    def extract_project_name(self, gizmo_id, project_data):
        """Try to extract meaningful project names from various sources"""
        names = set()

        # Method 1: Look for explicit project names in titles
        project_patterns = [
            r'^(.*?)\s*[:-]\s*Project',  # "Something - Project"
            r'^Project\s*[:-]\s*(.*)$',  # "Project - Something"
            r'^(.*?)\s+Project\s*$',     # "Something Project"
            r'^(.*?)\s*&\s*(.*)$',       # "Brand & Theme" patterns
            r'^(.*?)\s+(Plan|Planning|Strategy|Trip|Story|Stories)$',  # Common project suffixes
        ]

        for title in project_data['titles']:
            for pattern in project_patterns:
                match = re.search(pattern, title, re.IGNORECASE)
                if match:
                    if len(match.groups()) >= 2 and match.group(2):
                        # For patterns with two meaningful parts (like & or Trip/Story)
                        extracted_name = f"{match.group(1).strip()} {match.group(2).strip()}"
                    else:
                        extracted_name = match.group(1).strip()

                    if extracted_name and 3 <= len(extracted_name) <= 50:
                        # Clean up the name
                        extracted_name = extracted_name.replace("'", "").replace('"', '')
                        names.add(extracted_name)

        # Method 2: Check for titles that are clearly project names
        explicit_project_titles = []
        for title in project_data['titles']:
            # Skip generic titles
            if title.lower() in ['new chat', 'chat', 'discussion']:
                continue
            # Look for titles that sound like project names
            if any(keyword in title.lower() for keyword in
                   ['plan', 'strategy', 'system', 'platform', 'app', 'tool', 'design', 'development']):
                explicit_project_titles.append(title)

        if explicit_project_titles:
            # Take the most common or first one
            names.add(explicit_project_titles[0])

        # Method 3: Find common themes across multiple titles
        if not names and len(project_data['titles']) > 2:
            title_words = []
            for title in list(project_data['titles'])[:8]:  # Check more titles
                # Extract meaningful words (skip short/common words)
                words = [word for word in title.lower().split()
                        if len(word) > 3 and word not in
                        ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'chat', 'new',
                         'how', 'what', 'why', 'when', 'where', 'who', 'can', 'will', 'should']]
                title_words.extend(words)

            word_counts = Counter(title_words)
            # Find words that appear in multiple titles
            common_words = [word for word, count in word_counts.items()
                          if count >= 2 and len(word) > 3]

            if len(common_words) >= 2:
                names.add(f"{' '.join(common_words[:3]).title()}")
            elif common_words:
                names.add(common_words[0].title())

        # Method 4: Use the most descriptive title as fallback
        if not names and project_data['titles']:
            # Find the longest, most descriptive title
            best_title = max(project_data['titles'], key=lambda t: len(t.split()) if t else 0)
            if len(best_title) > 10 and len(best_title) < 40:
                names.add(best_title)

        return names if names else None

    def analyze_user_information(self):
        """Extract user-specific information"""
        print("\n👤 Analyzing user information...")

        user_related_fields = []
        memory_related_data = []
        profile_data = []

        for conv in self.data:
            if not isinstance(conv, dict):
                continue

            # Look for user profile data in messages
            mapping = conv.get('mapping', {})
            for message_id, message_data in mapping.items():
                if isinstance(message_data, dict) and message_data.get('message'):
                    msg = message_data['message']
                    content = msg.get('content', {})

                    # Check for user profile information
                    if isinstance(content, dict):
                        parts = content.get('parts', [])
                        for part in parts:
                            if isinstance(part, str):
                                if 'user profile' in part.lower() or 'user information' in part.lower():
                                    profile_data.append({
                                        'conversation_id': conv.get('id'),
                                        'title': conv.get('title'),
                                        'content': part[:200] + '...' if len(part) > 200 else part
                                    })

        # Look for memory-related fields
        memory_fields = ['memory_scope', 'is_do_not_remember', 'context_scopes']
        for conv in self.data:
            if not isinstance(conv, dict):
                continue

            memory_info = {}
            for field in memory_fields:
                if field in conv:
                    memory_info[field] = conv[field]

            if memory_info:
                memory_related_data.append({
                    'conversation_id': conv.get('id'),
                    'title': conv.get('title'),
                    'memory_data': memory_info
                })

        print(f"📝 Found {len(profile_data)} conversations with user profile data")
        print(f"🧠 Found {len(memory_related_data)} conversations with memory data")

        if profile_data:
            print("\n📋 Sample user profile data:")
            for item in profile_data[:3]:
                print(f"  {item['title']}: {item['content']}")

        if memory_related_data:
            print("\n🧠 Sample memory data:")
            for item in memory_related_data[:3]:
                print(f"  {item['title']}: {item['memory_data']}")

    def analyze_content_statistics(self):
        """Analyze content and message statistics"""
        print("\n📊 Analyzing content statistics...")

        total_messages = 0
        message_types = Counter()
        model_usage = Counter()
        creation_dates = []

        for conv in self.data:
            if not isinstance(conv, dict):
                continue

            # Track model usage
            model = conv.get('default_model_slug')
            if model:
                model_usage[model] += 1

            # Track creation dates
            create_time = conv.get('create_time')
            if create_time:
                creation_dates.append(datetime.fromtimestamp(create_time))

            # Analyze messages
            mapping = conv.get('mapping', {})
            for message_id, message_data in mapping.items():
                if isinstance(message_data, dict) and message_data.get('message'):
                    msg = message_data['message']
                    total_messages += 1

                    # Message author
                    author = msg.get('author', {})
                    role = author.get('role') if isinstance(author, dict) else str(author)
                    message_types[role] += 1

        print(f"💬 Total messages: {total_messages}")
        print(f"🤖 AI models used: {dict(model_usage)}")
        print(f"👥 Message types: {dict(message_types)}")

        if creation_dates:
            earliest = min(creation_dates)
            latest = max(creation_dates)
            print(f"📅 Date range: {earliest.date()} to {latest.date()}")

    def analyze_message_content(self):
        """Analyze message content patterns"""
        print("\n📝 Analyzing message content patterns...")

        content_types = Counter()
        total_content_length = 0
        message_count = 0

        for conv in self.data:
            if not isinstance(conv, dict):
                continue

            mapping = conv.get('mapping', {})
            for message_id, message_data in mapping.items():
                if isinstance(message_data, dict) and message_data.get('message'):
                    msg = message_data['message']
                    content = msg.get('content', {})

                    message_count += 1

                    # Analyze content types
                    if isinstance(content, dict):
                        content_type = content.get('content_type', 'unknown')
                        content_types[content_type] += 1

                        # Check content length
                        parts = content.get('parts', [])
                        for part in parts:
                            if isinstance(part, str):
                                total_content_length += len(part)

        print(f"📊 Content types: {dict(content_types)}")
        print(f"📏 Average message length: {total_content_length // message_count if message_count > 0 else 0} characters")

    def generate_report(self):
        """Generate comprehensive analysis report"""
        print("\n" + "="*80)
        print("🎯 CHATGPT ARCHIVE ANALYSIS REPORT")
        print("="*80)

        print(f"\n📁 File: {os.path.basename(self.file_path)}")
        print(f"📊 Total conversations: {len(self.data)}")
        print(f"🏷️ Conversations with projects: {len([c for c in self.data if isinstance(c, dict) and c.get('gizmo_id')])}")
        print(f"📋 Standalone conversations: {len([c for c in self.data if isinstance(c, dict) and not c.get('gizmo_id')])}")
        print(f"📂 Unique projects: {len(self.projects)}")

        print("\n🔍 ALL METADATA FIELDS DISCOVERED:")
        print("-" * 40)
        sorted_fields = sorted(self.metadata_fields)
        for i, field in enumerate(sorted_fields, 1):
            samples = list(self.field_values[field])[:3]
            sample_str = ", ".join(samples) if samples else "no samples"
            print(f"{i:2d}. {field}: {sample_str}")

        print("\n🏗️ PROJECT ANALYSIS:")
        print("-" * 40)
        print(f"Total projects found: {len(self.projects)}")
        for gizmo_id, project_data in sorted(self.projects.items(), key=lambda x: len(x[1]['conversations']), reverse=True)[:5]:
            print(f"• {gizmo_id}: {len(project_data['conversations'])} conversations")
            if project_data['titles']:
                sample_title = list(project_data['titles'])[0][:50]
                print(f"  └─ Sample: {sample_title}{'...' if len(sample_title) == 50 else ''}")

        print("\n💾 MEMORY & USER DATA FIELDS:")
        print("-" * 40)
        memory_fields = ['memory_scope', 'is_do_not_remember', 'context_scopes', 'sugar_item_id', 'owner']
        for field in memory_fields:
            if field in self.metadata_fields:
                samples = list(self.field_values[field])[:3]
                print(f"• {field}: {', '.join(samples) if samples else 'present'}")

        print("\n🔐 SECURITY & ACCESS FIELDS:")
        print("-" * 40)
        security_fields = ['safe_urls', 'blocked_urls', 'disabled_tool_ids', 'moderation_results']
        for field in security_fields:
            if field in self.metadata_fields:
                print(f"• {field}: present in {self.field_counts[field]} conversations")

        print("\n" + "="*80)

    def print_fields_analysis(self, category='all', show_values=False):
        """Print detailed field analysis"""
        print("\n🔍 METADATA FIELDS ANALYSIS:")
        print("-" * 40)

        field_categories = {
            'projects': ['gizmo_id', 'gizmo_type', 'conversation_template_id'],
            'memory': ['memory_scope', 'is_do_not_remember', 'context_scopes'],
            'security': ['safe_urls', 'blocked_urls', 'disabled_tool_ids', 'moderation_results'],
            'user': ['owner', 'sugar_item_id', 'sugar_item_visible', 'is_starred']
        }

        if category != 'all':
            target_fields = field_categories.get(category, [])
        else:
            target_fields = sorted(self.metadata_fields)

        for field in target_fields:
            if field in self.metadata_fields:
                count = self.field_counts[field]
                samples = list(self.field_values[field])[:5] if show_values else []
                sample_str = f" (samples: {', '.join(samples)})" if samples else ""
                print(f"• {field}: present in {count} conversations{sample_str}")

    def print_projects_analysis(self, names_only=False, detailed=False, project_id=None):
        """Print detailed project analysis"""
        print("\n🏗️ PROJECTS ANALYSIS:")
        print("-" * 40)

        if project_id:
            # Show specific project
            if project_id in self.projects:
                project = self.projects[project_id]
                print(f"Project ID: {project_id}")
                print(f"Type: {project['type']}")
                print(f"Template: {project['template_id']}")
                print(f"Conversations: {len(project['conversations'])}")
                print("Titles:")
                for title in sorted(project['titles'])[:10]:
                    print(f"  • {title}")
                if len(project['titles']) > 10:
                    print(f"  ... and {len(project['titles']) - 10} more")
            else:
                print(f"❌ Project {project_id} not found")
            return

        if names_only:
            print("Project Names (derived):")
            for gizmo_id, project_data in sorted(self.projects.items(), key=lambda x: len(x[1]['conversations']), reverse=True):
                possible_names = self.extract_project_name(gizmo_id, project_data)
                name_str = list(possible_names)[0] if possible_names else f"Project {gizmo_id.split('-')[-1][:8]}"
                print(f"• {name_str} ({len(project_data['conversations'])} conversations)")
        elif detailed:
            print(f"Total projects: {len(self.projects)}")
            print("\nDetailed project breakdown:")
            for gizmo_id, project_data in sorted(self.projects.items(), key=lambda x: len(x[1]['conversations']), reverse=True):
                print(f"\n📂 {gizmo_id}")
                print(f"   Type: {project_data['type']}")
                print(f"   Conversations: {len(project_data['conversations'])}")
                possible_names = self.extract_project_name(gizmo_id, project_data)
                if possible_names:
                    print(f"   Derived names: {', '.join(possible_names)}")
                print(f"   Sample titles: {', '.join(list(project_data['titles'])[:3])}")
        else:
            print(f"Total projects: {len(self.projects)}")
            print(f"Total conversations in projects: {sum(len(p['conversations']) for p in self.projects.values())}")
            print(f"Average conversations per project: {sum(len(p['conversations']) for p in self.projects.values()) // len(self.projects) if self.projects else 0}")

    def print_conversations(self, conv_id=None, project_id=None, limit=10, format_type='summary'):
        """Print conversation information"""
        print("\n💬 CONVERSATIONS:")
        print("-" * 40)

        conversations = self.data

        # Filter by conversation ID
        if conv_id:
            conversations = [c for c in conversations if isinstance(c, dict) and c.get('id') == conv_id]
            if not conversations:
                print(f"❌ Conversation {conv_id} not found")
                return

        # Filter by project
        elif project_id:
            conversations = [c for c in conversations if isinstance(c, dict) and c.get('gizmo_id') == project_id]
            print(f"Found {len(conversations)} conversations in project {project_id}")

        # Limit results
        conversations = conversations[:limit]

        for i, conv in enumerate(conversations, 1):
            if not isinstance(conv, dict):
                continue

            if format_type == 'summary':
                title = conv.get('title', 'No Title')
                gizmo_id = conv.get('gizmo_id', 'No Project')
                create_time = datetime.fromtimestamp(conv.get('create_time', 0)).strftime('%Y-%m-%d %H:%M')
                print(f"{i}. [{create_time}] {title[:60]}{'...' if len(title) > 60 else ''}")
                print(f"   ID: {conv.get('id', 'N/A')[:20]}... | Project: {gizmo_id}")

            elif format_type == 'full':
                print(f"\nConversation {i}:")
                for key, value in conv.items():
                    if key == 'mapping':
                        print(f"  {key}: {len(value)} messages")
                    elif isinstance(value, (str, int, float, bool)):
                        print(f"  {key}: {value}")
                    else:
                        print(f"  {key}: ({type(value).__name__})")

            elif format_type == 'messages':
                print(f"\nConversation {i} - {conv.get('title', 'No Title')}:")
                mapping = conv.get('mapping', {})
                for msg_id, msg_data in mapping.items():
                    if isinstance(msg_data, dict) and msg_data.get('message'):
                        msg = msg_data['message']
                        author = msg.get('author', {}).get('role', 'unknown') if isinstance(msg.get('author'), dict) else 'unknown'
                        content = msg.get('content', {})
                        if isinstance(content, dict):
                            parts = content.get('parts', [])
                            text = parts[0] if parts else 'No content'
                            print(f"  [{author}] {text[:100]}{'...' if len(text) > 100 else ''}")

    def search_conversations(self, title_query=None, content_query=None, project_id=None, model=None):
        """Search conversations by various criteria"""
        print("\n🔍 SEARCH RESULTS:")
        print("-" * 40)

        results = []

        for conv in self.data:
            if not isinstance(conv, dict):
                continue

            matches = []

            # Title search
            title = conv.get('title') or ''
            if title_query and title_query.lower() in title.lower():
                matches.append(f"title: {title_query}")

            # Content search
            if content_query:
                mapping = conv.get('mapping', {})
                for msg_data in mapping.values():
                    if isinstance(msg_data, dict) and msg_data.get('message'):
                        msg = msg_data['message']
                        content = msg.get('content', {})
                        if isinstance(content, dict):
                            parts = content.get('parts', [])
                            for part in parts:
                                if isinstance(part, str) and content_query.lower() in part.lower():
                                    matches.append(f"content: {content_query}")
                                    break
                    if matches and 'content' in str(matches[-1]):
                        break

            # Project filter
            if project_id and conv.get('gizmo_id') != project_id:
                matches = []

            # Model filter
            if model and conv.get('default_model_slug') != model:
                matches = []

            if matches:
                results.append({
                    'conversation': conv,
                    'matches': matches
                })

        print(f"Found {len(results)} matching conversations:")

        for i, result in enumerate(results[:20], 1):  # Limit to 20 results
            conv = result['conversation']
            title = conv.get('title', 'No Title')
            conv_id = conv.get('id', 'N/A')
            print(f"\n{i}. {title[:60]}{'...' if len(title) > 60 else ''}")
            print(f"   ID: {conv_id[:20]}... | Matches: {', '.join(result['matches'])}")

        if len(results) > 20:
            print(f"\n... and {len(results) - 20} more results")

    def print_model_usage_stats(self):
        """Print AI model usage statistics"""
        print("\n🤖 AI MODEL USAGE:")
        print("-" * 40)

        model_usage = Counter()
        for conv in self.data:
            if isinstance(conv, dict):
                model = conv.get('default_model_slug')
                if model:
                    model_usage[model] += 1

        for model, count in sorted(model_usage.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(self.data)) * 100
            print(".1f")

    def print_timeline_stats(self):
        """Print conversation timeline statistics"""
        print("\n📅 CONVERSATION TIMELINE:")
        print("-" * 40)

        dates = []
        for conv in self.data:
            if isinstance(conv, dict):
                create_time = conv.get('create_time')
                if create_time:
                    dates.append(datetime.fromtimestamp(create_time))

        if dates:
            earliest = min(dates)
            latest = max(dates)
            print(f"Date range: {earliest.date()} to {latest.date()}")

            # Group by month
            monthly = Counter()
            for date in dates:
                monthly[date.strftime('%Y-%m')] += 1

            print("\nConversations by month:")
            for month, count in sorted(monthly.items()):
                print(f"  {month}: {count} conversations")

    def print_project_stats(self):
        """Print project statistics"""
        print("\n📊 PROJECT STATISTICS:")
        print("-" * 40)

        project_sizes = [len(p['conversations']) for p in self.projects.values()]
        if project_sizes:
            print(f"Total projects: {len(self.projects)}")
            print(f"Average conversations per project: {sum(project_sizes) / len(project_sizes):.1f}")
            print(f"Largest project: {max(project_sizes)} conversations")
            print(f"Smallest project: {min(project_sizes)} conversations")

            # Distribution
            size_ranges = {'1': 0, '2-5': 0, '6-10': 0, '11-20': 0, '21+': 0}
            for size in project_sizes:
                if size == 1:
                    size_ranges['1'] += 1
                elif 2 <= size <= 5:
                    size_ranges['2-5'] += 1
                elif 6 <= size <= 10:
                    size_ranges['6-10'] += 1
                elif 11 <= size <= 20:
                    size_ranges['11-20'] += 1
                else:
                    size_ranges['21+'] += 1

            print("\nProject size distribution:")
            for range_name, count in size_ranges.items():
                print(f"  {range_name} conversations: {count} projects")

    def print_general_stats(self):
        """Print general statistics"""
        total_convs = len(self.data)
        project_convs = sum(len(p['conversations']) for p in self.projects.values())
        standalone_convs = total_convs - project_convs

        print("\n📈 GENERAL STATISTICS:")
        print("-" * 40)
        print(f"Total conversations: {total_convs}")
        print(f"Conversations in projects: {project_convs} ({project_convs/total_convs*100:.1f}%)")
        print(f"Standalone conversations: {standalone_convs} ({standalone_convs/total_convs*100:.1f}%)")
        print(f"Unique projects: {len(self.projects)}")
        print(f"Metadata fields discovered: {len(self.metadata_fields)}")

    def export_data(self, format_type='json', data_type='conversations', output_file=None):
        """Export data in various formats"""
        print(f"📤 Exporting {data_type} as {format_type} to {output_file}...")

        if data_type == 'conversations':
            data = self.data
        elif data_type == 'projects':
            data = {gid: {
                'name': list(self.extract_project_name(gid, pdata))[0] if self.extract_project_name(gid, pdata) else f"Project {gid.split('-')[-1][:8]}",
                'conversation_count': len(pdata['conversations']),
                'type': pdata['type'],
                'conversation_ids': [c.get('id') for c in pdata['conversations']]
            } for gid, pdata in self.projects.items()}
        elif data_type == 'fields':
            data = {
                'all_fields': sorted(list(self.metadata_fields)),
                'field_counts': dict(self.field_counts),
                'field_samples': {field: list(samples) for field, samples in self.field_values.items()}
            }
        elif data_type == 'stats':
            data = {
                'total_conversations': len(self.data),
                'projects': len(self.projects),
                'standalone_conversations': len([c for c in self.data if isinstance(c, dict) and not c.get('gizmo_id')]),
                'metadata_fields': len(self.metadata_fields)
            }

        if format_type == 'json':
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        elif format_type == 'csv':
            # Basic CSV export for conversations
            import csv
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Title', 'Create Time', 'Project ID', 'Message Count'])
                for conv in self.data:
                    if isinstance(conv, dict):
                        mapping = conv.get('mapping', {})
                        writer.writerow([
                            conv.get('id', ''),
                            conv.get('title', ''),
                            conv.get('create_time', ''),
                            conv.get('gizmo_id', ''),
                            len(mapping)
                        ])
        elif format_type == 'txt':
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"ChatGPT Archive Analysis - {data_type.upper()}\n")
                f.write("="*50 + "\n\n")
                if isinstance(data, dict):
                    for key, value in data.items():
                        f.write(f"{key}: {value}\n")
                else:
                    f.write(str(data))

        print(f"✅ Exported to {output_file}")

    def run_full_analysis(self):
        """Run complete analysis"""
        self.load_data()
        self.analyze_metadata_fields()
        self.analyze_projects_and_gizmos()
        self.analyze_user_information()
        self.analyze_content_statistics()
        self.analyze_message_content()
        self.generate_report()


def create_parser():
    """Create the main argument parser with subcommands"""
    parser = argparse.ArgumentParser(
        description='ChatGPT Archive Metadata Analyzer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python analyze_chatgpt_archive.py analyze
  python analyze_chatgpt_archive.py fields --category projects
  python analyze_chatgpt_archive.py projects --names-only
  python analyze_chatgpt_archive.py conversations --id 695c5ef9-e248-832f-ae68-4f15ba2a84fc
  python analyze_chatgpt_archive.py search --project g-p-67f6f442bec08191b02fdd71c03312b1
  python analyze_chatgpt_archive.py stats --model-usage
  python analyze_chatgpt_archive.py export --format json --type projects
        """
    )

    parser.add_argument('--file', '-f', default='../data/conversations.json',
                       help='Path to conversations.json file (default: ../data/conversations.json)')

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Run full analysis')
    analyze_parser.add_argument('--output', '-o', help='Save report to file')

    # Fields command
    fields_parser = subparsers.add_parser('fields', help='List and analyze metadata fields')
    fields_parser.add_argument('--category', choices=['all', 'projects', 'memory', 'security', 'user'],
                              default='all', help='Filter fields by category')
    fields_parser.add_argument('--values', action='store_true', help='Show sample values for each field')

    # Projects command
    projects_parser = subparsers.add_parser('projects', help='Analyze project structure')
    projects_parser.add_argument('--names-only', action='store_true', help='Show only project names')
    projects_parser.add_argument('--detailed', action='store_true', help='Show detailed project information')
    projects_parser.add_argument('--id', help='Show details for specific project ID')

    # Conversations command
    conv_parser = subparsers.add_parser('conversations', help='Extract conversation data')
    conv_parser.add_argument('--id', help='Get conversation by ID')
    conv_parser.add_argument('--project', help='Get conversations for project ID')
    conv_parser.add_argument('--limit', type=int, default=10, help='Limit number of results')
    conv_parser.add_argument('--format', choices=['summary', 'full', 'messages'], default='summary')

    # Search command
    search_parser = subparsers.add_parser('search', help='Search conversations')
    search_parser.add_argument('--title', help='Search in conversation titles')
    search_parser.add_argument('--content', help='Search in message content')
    search_parser.add_argument('--project', help='Filter by project ID')
    search_parser.add_argument('--model', help='Filter by AI model')

    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show statistics')
    stats_parser.add_argument('--model-usage', action='store_true', help='Show AI model usage statistics')
    stats_parser.add_argument('--timeline', action='store_true', help='Show conversation timeline')
    stats_parser.add_argument('--projects', action='store_true', help='Show project statistics')

    # Export command
    export_parser = subparsers.add_parser('export', help='Export data')
    export_parser.add_argument('--format', choices=['json', 'csv', 'txt'], default='json')
    export_parser.add_argument('--type', choices=['conversations', 'projects', 'fields', 'stats'],
                              default='conversations', help='Type of data to export')
    export_parser.add_argument('--output', '-o', required=True, help='Output file path')

    return parser

def main():
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if not os.path.exists(args.file):
        print(f"❌ File not found: {args.file}")
        sys.exit(1)

    analyzer = ChatGPTArchiveAnalyzer(args.file)

    # Load data for all commands
    analyzer.load_data()

    if args.command == 'analyze':
        analyzer.run_full_analysis()
        if args.output:
            # Save full report to file
            with open(args.output, 'w', encoding='utf-8') as f:
                # Redirect stdout temporarily
                import io
                from contextlib import redirect_stdout

                output_buffer = io.StringIO()
                with redirect_stdout(output_buffer):
                    analyzer.run_full_analysis()
                f.write(output_buffer.getvalue())
            print(f"💾 Full report saved to: {args.output}")

    elif args.command == 'fields':
        analyzer.analyze_metadata_fields()
        analyzer.print_fields_analysis(category=args.category, show_values=args.values)

    elif args.command == 'projects':
        analyzer.analyze_projects_and_gizmos()
        analyzer.print_projects_analysis(names_only=args.names_only, detailed=args.detailed, project_id=args.id)

    elif args.command == 'conversations':
        analyzer.print_conversations(
            conv_id=args.id,
            project_id=args.project,
            limit=args.limit,
            format_type=args.format
        )

    elif args.command == 'search':
        analyzer.search_conversations(
            title_query=args.title,
            content_query=args.content,
            project_id=args.project,
            model=args.model
        )

    elif args.command == 'stats':
        analyzer.analyze_content_statistics()
        if args.model_usage:
            analyzer.print_model_usage_stats()
        elif args.timeline:
            analyzer.print_timeline_stats()
        elif args.projects:
            analyzer.print_project_stats()
        else:
            analyzer.print_general_stats()

    elif args.command == 'export':
        analyzer.export_data(format_type=args.format, data_type=args.type, output_file=args.output)

if __name__ == "__main__":
    main()
