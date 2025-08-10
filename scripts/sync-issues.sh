#!/bin/bash

# Sync issues from open-source repo to SaaS repo
# Usage: ./scripts/sync-issues.sh

set -e

# Repository configurations
OS_REPO="dotnetfactory/fluid-calendar"
SAAS_REPO="dotnetfactory/fluid-calendar-saas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Syncing issues from ${OS_REPO} to ${SAAS_REPO}${NC}"

# Create sync label if it doesn't exist
gh label create "synced-from-os" --description "Issue synced from open source repo" --color "E99695" --repo "$SAAS_REPO" 2>/dev/null || true

# Get open issues from OS repo that aren't already synced
echo -e "${YELLOW}📋 Fetching open issues from ${OS_REPO}...${NC}"

# Get issues from OS repo (filter out ones already synced)
total_issues=$(gh issue list --repo "$OS_REPO" --state open --json number | jq length)
echo -e "${YELLOW}📊 Found ${total_issues} open issues in ${OS_REPO}${NC}"

os_issues=$(gh issue list --repo "$OS_REPO" --state open --json number,title,body,labels,url --limit 200)

echo "$os_issues" | jq -r '.[] | @base64' | while IFS= read -r issue; do
    # Decode the issue
    issue_data=$(echo "$issue" | base64 --decode)
    
    # Extract issue details
    issue_number=$(echo "$issue_data" | jq -r '.number')
    issue_title=$(echo "$issue_data" | jq -r '.title')
    issue_body=$(echo "$issue_data" | jq -r '.body // ""')
    issue_url=$(echo "$issue_data" | jq -r '.url')
    issue_labels=$(echo "$issue_data" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')
    
    # Check if this issue is already synced to SaaS repo
    sync_title="[OS-${issue_number}] ${issue_title}"
    
    existing_issue=$(gh issue list --repo "$SAAS_REPO" --search "\"[OS-${issue_number}]\" in:title" --json number --limit 1)
    
    if [ "$(echo "$existing_issue" | jq length)" -eq 0 ]; then
        echo -e "${GREEN}📝 Syncing issue #${issue_number}: ${issue_title}${NC}"
        
        # Create issue body with reference to original
        new_body="**Synced from Open Source Repository**
Original Issue: ${issue_url}
Original Issue Number: #${issue_number}

---

${issue_body}

---

*This issue was automatically synced from the open source repository. Changes made here may need to be backported to the open source version.*"
        
        # Create the issue in SaaS repo
        labels_flag=""
        if [ -n "$issue_labels" ]; then
            labels_flag="--label synced-from-os,${issue_labels}"
        else
            labels_flag="--label synced-from-os"
        fi
        
        gh issue create \
            --repo "$SAAS_REPO" \
            --title "$sync_title" \
            --body "$new_body" \
            $labels_flag
            
        echo -e "${GREEN}✅ Created issue: ${sync_title}${NC}"
    else
        echo -e "${YELLOW}⏭️  Issue #${issue_number} already synced${NC}"
    fi
done

echo -e "${GREEN}✨ Issue sync completed!${NC}"