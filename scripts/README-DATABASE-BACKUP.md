# MongoDB Atlas Backup & Local Sync

This project includes automated MongoDB Atlas backups and a local synchronization workflow.

## 1. GitHub Secrets Setup

To enable automated backups, you **MUST** add the following secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):

- `MONGODB_ATLAS_URI`: Your full MongoDB Atlas connection string (found in `.env.local`).
- `MONGODB_ATLAS_DATABASE`: The database name (`abehotel`).

## 2. GitHub Actions Workflows

- **MongoDB Atlas Backup**: 
  - Runs daily at midnight.
  - Can be triggered manually from the "Actions" tab.
  - Generates a zip artifact containing the database dump.
- **MongoDB Atlas Restore**:
  - Manually triggered to restore your Atlas database from a previous backup artifact or a direct URL.
  - **CAUTION**: Uses the `--drop` flag, which deletes existing data before restoring.

## 3. Local Sync Script (`scripts/sync-db-local.ps1`)

This script allows you to quickly refresh your local MongoDB instance with the latest production data from Atlas.

### Prerequisites:
- **GitHub CLI (`gh`)**: [Download & Install](https://cli.github.com/).
- **MongoDB Database Tools**: [Download & Install](https://www.mongodb.com/try/download/database-tools).
- **Authenticated GH CLI**: Run `gh auth login` in your terminal.

### Usage:
1. Ensure a backup has run on GitHub and generated an artifact.
2. Open PowerShell as Administrator (or ensure script execution is allowed).
3. Run the script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "./scripts/sync-db-local.ps1"
   ```

The script will automatically:
1. Find the latest successful backup artifact on GitHub.
2. Download and extract it.
3. Use `mongorestore --drop` to update your local database.
4. Clean up temporary files.
