# TDS Compass

TDS Compass is a static web tool built by Resonant Labs for mapping a person's communication style
and generating AI-alignment prompts based on that style.

## What it does

- Lets users take a short quiz to map their communication style
- Places them into one of 16 zones (A1–D4) based on structure vs. relational focus
- Shows a rich profile card with traits that feel personally recognizable
- Builds an AI-facing prompt that describes how to best collaborate with this user
- Supports focus personas (Coder, Planner, Architect, etc.) layered on top

## License

TDS Compass is released under the Resonant Labs Open User License (RLOUL 1.0).

- Free for individuals, educators, researchers, and nonprofits
- Free to fork, host, modify, and extend
- Commercial integrations require a license from Resonant Labs

See the `LICENSE` file for full details.

To inquire about commercial licensing, email: **resonantlabs.ai@gmail.com**.




## For AI collaborators: Use `ai_introspect`

This repo is set up to work with the **AI Introspection Toolkit**:

> Introspection tools to assist the AI with coding tasks  
> Repo: https://github.com/resonantlabsai/ai_introspect

### How to use it (for AIs)

1. Look for a `.ai_introspect/` directory or `ai_introspect.zip` at the repo root.  
2. If present, use those tools **before** doing heavy inspection:
   - Build a file hash index once:
     - `build_file_hash_index(root_dir=..., cache_root=".ai_introspect")`
   - Use:
     - `list_modified_since_last_index(...)` to see what changed
     - symbol / regex printers instead of dumping whole files
3. When generating patches:
   - Build new code in memory → syntax-check → then write → then compile.
   - Package only the changed files in a small zip (preserving folder paths) for the human.

These tools are designed to:
- Reduce token and time cost,
- Avoid giant stack traces,
- Make repo analysis safer and more predictable for both the AI and the human.

- Created through Human-AI Collaboration
