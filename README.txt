ViralPack V2 Integrated Fix, Copyright Agent Upgrade
===================================================

What changed
------------
1. The dedicated /copyright tab is now a bulk media filing-packet builder, not a JSON dump.
2. Users can upload bulk files and export one copyright submission packet ZIP containing:
   - 01_READ_ME_FIRST.txt
   - 02_REGISTRATION_WORKSHEET.doc
   - 03_MEDIA_INDEX.csv
   - 04_DEPOSIT_MANIFEST.txt
   - 05_TITLE_LIST.txt
   - 06_FILING_INSTRUCTIONS.txt
   - metadata/extracted_metadata.json
   - media/* original uploaded files
3. Generator now still supports the copyright checkbox, and can export a human filing packet ZIP from generated hook/caption outputs.
4. Studio now exports a filing packet ZIP from Viral Pack output, ad plan output, and copyright output.
5. Dropbox upload remains optional. Local download is the default.
6. Added JSZip and a packet builder pipeline under lib/copyright/shared.js.
7. Added /api/copyright/packet as an alias to the export route so the dedicated page can build and download packets directly.

How it works
------------
- The tool is a filing-prep agent, not an auto-submitter.
- It infers titles, file inventory, work type, worksheet entries, and deposit guidance.
- It packages the user files together with a worksheet and instructions for a human filer.
- If OPENAI_API_KEY is present, the packet may also include a concise AI copyright notes file in metadata/ai_copyright_pack.txt.

Important notes
---------------
- This package does not itself submit a copyright registration.
- The filer still must verify author, claimant, publication facts, and the correct registration path.
- Dropbox sign-in OAuth is still not fully wired. Current support is token-based upload only.
- This ZIP is sanitized. It should exclude .env, .next, and node_modules from the deliverable zip you hand off.

Run locally
-----------
1. npm install
2. create .env from .env.example or your own env file
3. ensure OPENAI_API_KEY and BETA_COOKIE_SECRET are set
4. npm run dev
5. verify the beta key
6. test /generator, /studio, and /copyright

Suggested smoke test
--------------------
1. Open /copyright
2. Upload 2 or 3 files
3. Build filing packet
4. Confirm the ZIP downloads
5. Open the ZIP and verify the worksheet, CSV, manifest, instructions, and media folder all exist
