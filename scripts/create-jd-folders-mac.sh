#!/bin/bash
# Johnny Decimal Folder Structure Creator for macOS
# Creates the JD structure in iCloud Drive and ProtonDrive
# Author: Created for James
# Date: December 2024

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Adjust these paths as needed
ICLOUD_BASE="$HOME/Library/Mobile Documents/com~apple~CloudDocs/JohnnyDecimal"
PROTON_BASE="$HOME/Library/CloudStorage/ProtonDrive-jmeg8r@jmeg8r.com-folder/JohnnyDecimal"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to create a folder if it doesn't exist
create_folder() {
    local path="$1"
    if [ ! -d "$path" ]; then
        mkdir -p "$path"
        print_status "Created: $path"
    else
        print_info "Exists: $path"
    fi
}

# Function to create the JD structure
create_jd_structure() {
    local base_path="$1"
    local structure_type="$2"  # "full", "personal", "resistance", "work"
    
    print_info "Creating Johnny Decimal structure in: $base_path"
    echo ""
    
    # 00-09 System & Meta
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/00-09 System"
        create_folder "$base_path/00-09 System/00 Index"
        create_folder "$base_path/00-09 System/00 Index/00.01 JDex Database"
        create_folder "$base_path/00-09 System/00 Index/00.02 System Documentation"
        create_folder "$base_path/00-09 System/01 Inbox"
        create_folder "$base_path/00-09 System/01 Inbox/01.01 Triage"
        create_folder "$base_path/00-09 System/01 Inbox/01.02 To Process"
        create_folder "$base_path/00-09 System/02 Templates"
        create_folder "$base_path/00-09 System/02 Templates/02.01 Document Templates"
        create_folder "$base_path/00-09 System/02 Templates/02.02 Email Templates"
        create_folder "$base_path/00-09 System/03 Archive Index"
        create_folder "$base_path/00-09 System/03 Archive Index/03.01 Archive Catalog"
    fi
    
    # 10-19 Personal Life Admin
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/10-19 Personal"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal/11.01 Passports"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal/11.02 Drivers License"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal/11.03 Birth Certificates"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal/11.04 Social Security"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal/11.05 Wills and Estate"
        create_folder "$base_path/10-19 Personal/11 Identity and Legal/11.06 Power of Attorney"
        create_folder "$base_path/10-19 Personal/12 Health"
        create_folder "$base_path/10-19 Personal/12 Health/12.01 Medical Records"
        create_folder "$base_path/10-19 Personal/12 Health/12.02 PBC Research"
        create_folder "$base_path/10-19 Personal/12 Health/12.03 Prescriptions"
        create_folder "$base_path/10-19 Personal/12 Health/12.04 Insurance Claims"
        create_folder "$base_path/10-19 Personal/12 Health/12.05 Provider Information"
        create_folder "$base_path/10-19 Personal/13 Finance"
        create_folder "$base_path/10-19 Personal/13 Finance/13.01 Bank Accounts"
        create_folder "$base_path/10-19 Personal/13 Finance/13.02 Credit Cards"
        create_folder "$base_path/10-19 Personal/13 Finance/13.03 Tax Returns"
        create_folder "$base_path/10-19 Personal/13 Finance/13.04 Tax Documents"
        create_folder "$base_path/10-19 Personal/13 Finance/13.05 Receipts"
        create_folder "$base_path/10-19 Personal/13 Finance/13.06 Budget"
        create_folder "$base_path/10-19 Personal/14 Investments"
        create_folder "$base_path/10-19 Personal/14 Investments/14.01 Portfolio Overview"
        create_folder "$base_path/10-19 Personal/14 Investments/14.02 HDP Strategy Research"
        create_folder "$base_path/10-19 Personal/14 Investments/14.03 Brokerage Statements"
        create_folder "$base_path/10-19 Personal/14 Investments/14.04 Dividend Tracking"
        create_folder "$base_path/10-19 Personal/14 Investments/14.05 Retirement Accounts"
        create_folder "$base_path/10-19 Personal/15 Home and Property"
        create_folder "$base_path/10-19 Personal/15 Home and Property/15.01 Mortgage Documents"
        create_folder "$base_path/10-19 Personal/15 Home and Property/15.02 Property Tax"
        create_folder "$base_path/10-19 Personal/15 Home and Property/15.03 Home Warranty"
        create_folder "$base_path/10-19 Personal/15 Home and Property/15.04 Utilities"
        create_folder "$base_path/10-19 Personal/15 Home and Property/15.05 Maintenance Records"
        create_folder "$base_path/10-19 Personal/16 Vehicles"
        create_folder "$base_path/10-19 Personal/16 Vehicles/16.01 Registration"
        create_folder "$base_path/10-19 Personal/16 Vehicles/16.02 Service Records"
        create_folder "$base_path/10-19 Personal/16 Vehicles/16.03 Loan Documents"
        create_folder "$base_path/10-19 Personal/17 Insurance"
        create_folder "$base_path/10-19 Personal/17 Insurance/17.01 Health Insurance"
        create_folder "$base_path/10-19 Personal/17 Insurance/17.02 Auto Insurance"
        create_folder "$base_path/10-19 Personal/17 Insurance/17.03 Home Insurance"
        create_folder "$base_path/10-19 Personal/17 Insurance/17.04 Life Insurance"
    fi
    
    # 20-29 UF Health Work (Only create marker - actual folders on Work OneDrive)
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/20-29 UF Health [See Work OneDrive]"
        # Create a README explaining this area lives elsewhere
        echo "# 20-29 UF Health VMware Work

This area is stored on your Work OneDrive account for compliance and security.

See: Work OneDrive → JohnnyDecimal → 20-29 UF Health

Categories:
- 21 Infrastructure Documentation
- 22 PowerCLI Scripts and Tools
- 23 Backup Projects
- 24 VM Management
- 25 Procedures and Runbooks
- 26 Vendor and Licensing
- 27 Training Materials
" > "$base_path/20-29 UF Health [See Work OneDrive]/README.md"
    fi
    
    # 30-39 As The Geek Learns
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/30-39 As The Geek Learns"
        create_folder "$base_path/30-39 As The Geek Learns/31 Brand Identity"
        create_folder "$base_path/30-39 As The Geek Learns/31 Brand Identity/31.01 Logo Assets"
        create_folder "$base_path/30-39 As The Geek Learns/31 Brand Identity/31.02 Color Palette"
        create_folder "$base_path/30-39 As The Geek Learns/31 Brand Identity/31.03 Typography"
        create_folder "$base_path/30-39 As The Geek Learns/31 Brand Identity/31.04 Brand Guidelines"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course/32.01 Course Outline"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course/32.02 Module 1 Introduction"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course/32.03 Module 2 Basics"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course/32.04 Module 3 Enterprise"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course/32.05 Code Examples"
        create_folder "$base_path/30-39 As The Geek Learns/32 PowerCLI Course/32.06 Lab Exercises"
        create_folder "$base_path/30-39 As The Geek Learns/33 Website Platform"
        create_folder "$base_path/30-39 As The Geek Learns/33 Website Platform/33.01 Site Design"
        create_folder "$base_path/30-39 As The Geek Learns/33 Website Platform/33.02 Content"
        create_folder "$base_path/30-39 As The Geek Learns/33 Website Platform/33.03 SEO"
        create_folder "$base_path/30-39 As The Geek Learns/34 Marketing"
        create_folder "$base_path/30-39 As The Geek Learns/34 Marketing/34.01 Social Media Content"
        create_folder "$base_path/30-39 As The Geek Learns/34 Marketing/34.02 Email Campaigns"
        create_folder "$base_path/30-39 As The Geek Learns/34 Marketing/34.03 Promotional Graphics"
        create_folder "$base_path/30-39 As The Geek Learns/35 Audience"
        create_folder "$base_path/30-39 As The Geek Learns/35 Audience/35.01 Subscriber Analytics"
        create_folder "$base_path/30-39 As The Geek Learns/35 Audience/35.02 Feedback"
        create_folder "$base_path/30-39 As The Geek Learns/36 Future Courses"
        create_folder "$base_path/30-39 As The Geek Learns/36 Future Courses/36.01 Course Ideas"
        create_folder "$base_path/30-39 As The Geek Learns/36 Future Courses/36.02 Research"
    fi
    
    # 40-49 Development Projects
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/40-49 Development"
        create_folder "$base_path/40-49 Development/41 KlockThingy"
        create_folder "$base_path/40-49 Development/41 KlockThingy/41.01 Source Code [See GitHub]"
        create_folder "$base_path/40-49 Development/41 KlockThingy/41.02 Build Artifacts"
        create_folder "$base_path/40-49 Development/41 KlockThingy/41.03 Documentation"
        create_folder "$base_path/40-49 Development/41 KlockThingy/41.04 Release Notes"
        create_folder "$base_path/40-49 Development/42 Apple Developer"
        create_folder "$base_path/40-49 Development/42 Apple Developer/42.01 Learning Notes"
        create_folder "$base_path/40-49 Development/42 Apple Developer/42.02 Practice Projects"
        create_folder "$base_path/40-49 Development/42 Apple Developer/42.03 Certificates and Profiles"
        create_folder "$base_path/40-49 Development/43 GitHub Repos"
        create_folder "$base_path/40-49 Development/43 GitHub Repos/43.01 Repository Index"
        create_folder "$base_path/40-49 Development/43 GitHub Repos/43.02 Documentation"
        create_folder "$base_path/40-49 Development/44 Code Experiments"
        create_folder "$base_path/40-49 Development/44 Code Experiments/44.01 Python"
        create_folder "$base_path/40-49 Development/44 Code Experiments/44.02 Swift"
        create_folder "$base_path/40-49 Development/44 Code Experiments/44.03 PowerShell"
        create_folder "$base_path/40-49 Development/44 Code Experiments/44.04 Web Development"
        create_folder "$base_path/40-49 Development/45 Tools and Environments"
        create_folder "$base_path/40-49 Development/45 Tools and Environments/45.01 IDE Configurations"
        create_folder "$base_path/40-49 Development/45 Tools and Environments/45.02 Dev Environment Setup"
        create_folder "$base_path/40-49 Development/45 Tools and Environments/45.03 MCP Integrations"
    fi
    
    # 50-59 Resistance (Always on ProtonDrive - create full structure there)
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "resistance" ]; then
        create_folder "$base_path/50-59 Resistance"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise/51.01 Published Articles"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise/51.02 Drafts"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise/51.03 Research"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise/51.04 Palantir ICE Coverage"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise/51.05 Surveillance Tech Research"
        create_folder "$base_path/50-59 Resistance/51 Resist and Rise/51.06 Source Materials"
        create_folder "$base_path/50-59 Resistance/52 NC Florida Indivisible"
        create_folder "$base_path/50-59 Resistance/52 NC Florida Indivisible/52.01 Leadership Documents"
        create_folder "$base_path/50-59 Resistance/52 NC Florida Indivisible/52.02 Meeting Notes"
        create_folder "$base_path/50-59 Resistance/52 NC Florida Indivisible/52.03 Strategy Planning"
        create_folder "$base_path/50-59 Resistance/52 NC Florida Indivisible/52.04 Membership"
        create_folder "$base_path/50-59 Resistance/52 NC Florida Indivisible/52.05 Bylaws and Governance"
        create_folder "$base_path/50-59 Resistance/53 Social Media"
        create_folder "$base_path/50-59 Resistance/53 Social Media/53.01 Content Calendar"
        create_folder "$base_path/50-59 Resistance/53 Social Media/53.02 Graphics and Assets"
        create_folder "$base_path/50-59 Resistance/53 Social Media/53.03 Analytics"
        create_folder "$base_path/50-59 Resistance/53 Social Media/53.04 Platform Guidelines"
        create_folder "$base_path/50-59 Resistance/54 Actions and Protests"
        create_folder "$base_path/50-59 Resistance/54 Actions and Protests/54.01 Event Planning"
        create_folder "$base_path/50-59 Resistance/54 Actions and Protests/54.02 Permits and Legal"
        create_folder "$base_path/50-59 Resistance/54 Actions and Protests/54.03 Safety Protocols"
        create_folder "$base_path/50-59 Resistance/54 Actions and Protests/54.04 Post Event Reports"
        create_folder "$base_path/50-59 Resistance/55 Mutual Aid"
        create_folder "$base_path/50-59 Resistance/55 Mutual Aid/55.01 Programs"
        create_folder "$base_path/50-59 Resistance/55 Mutual Aid/55.02 Resources"
        create_folder "$base_path/50-59 Resistance/55 Mutual Aid/55.03 Partner Organizations"
        create_folder "$base_path/50-59 Resistance/56 Canvassing"
        create_folder "$base_path/50-59 Resistance/56 Canvassing/56.01 Scripts"
        create_folder "$base_path/50-59 Resistance/56 Canvassing/56.02 Materials"
        create_folder "$base_path/50-59 Resistance/56 Canvassing/56.03 Territory Maps"
        create_folder "$base_path/50-59 Resistance/56 Canvassing/56.04 Results Tracking"
        create_folder "$base_path/50-59 Resistance/57 Progressive Campaigns"
        create_folder "$base_path/50-59 Resistance/57 Progressive Campaigns/57.01 Active Campaigns"
        create_folder "$base_path/50-59 Resistance/57 Progressive Campaigns/57.02 Candidate Research"
        create_folder "$base_path/50-59 Resistance/57 Progressive Campaigns/57.03 Voter Information"
        create_folder "$base_path/50-59 Resistance/58 Contacts Coalition"
        create_folder "$base_path/50-59 Resistance/58 Contacts Coalition/58.01 Partner Organizations"
        create_folder "$base_path/50-59 Resistance/58 Contacts Coalition/58.02 Key Contacts"
        create_folder "$base_path/50-59 Resistance/58 Contacts Coalition/58.03 Communication History"
    fi
    
    # For iCloud, create a pointer to ProtonDrive for Resistance
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        if [ "$base_path" == "$ICLOUD_BASE" ]; then
            create_folder "$base_path/50-59 Resistance [See ProtonDrive]"
            echo "# 50-59 Resistance

⚠️ SENSITIVE CONTENT - Stored on ProtonDrive for security

This area contains sensitive organizing materials and is stored exclusively 
on ProtonDrive for end-to-end encryption.

See: ProtonDrive → JohnnyDecimal → 50-59 Resistance

Categories:
- 51 Resist and Rise (Substack)
- 52 NC Florida Indivisible
- 53 Social Media Management
- 54 Actions and Protests
- 55 Mutual Aid
- 56 Canvassing
- 57 Progressive Campaigns
- 58 Contacts and Coalition
" > "$base_path/50-59 Resistance [See ProtonDrive]/README.md"
        fi
    fi
    
    # 60-69 Learning & Resources
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/60-69 Learning"
        create_folder "$base_path/60-69 Learning/61 Books"
        create_folder "$base_path/60-69 Learning/61 Books/61.01 Currently Reading"
        create_folder "$base_path/60-69 Learning/61 Books/61.02 Book Notes"
        create_folder "$base_path/60-69 Learning/61 Books/61.03 Reading List"
        create_folder "$base_path/60-69 Learning/62 Courses"
        create_folder "$base_path/60-69 Learning/62 Courses/62.01 Active Courses"
        create_folder "$base_path/60-69 Learning/62 Courses/62.02 Completed"
        create_folder "$base_path/60-69 Learning/62 Courses/62.03 Certificates"
        create_folder "$base_path/60-69 Learning/63 Reference"
        create_folder "$base_path/60-69 Learning/63 Reference/63.01 Technical Documentation"
        create_folder "$base_path/60-69 Learning/63 Reference/63.02 Cheat Sheets"
        create_folder "$base_path/60-69 Learning/63 Reference/63.03 Best Practices"
        create_folder "$base_path/60-69 Learning/64 Research"
        create_folder "$base_path/60-69 Learning/64 Research/64.01 Saved Articles"
        create_folder "$base_path/60-69 Learning/64 Research/64.02 Topic Collections"
    fi
    
    # 90-99 Archive
    if [ "$structure_type" == "full" ] || [ "$structure_type" == "personal" ]; then
        create_folder "$base_path/90-99 Archive"
        create_folder "$base_path/90-99 Archive/91 Archived Projects"
        create_folder "$base_path/90-99 Archive/91 Archived Projects/91.01 Completed Projects"
        create_folder "$base_path/90-99 Archive/91 Archived Projects/91.02 Abandoned Projects"
        create_folder "$base_path/90-99 Archive/92 Historical"
        create_folder "$base_path/90-99 Archive/92 Historical/92.01 Old Documents"
        create_folder "$base_path/90-99 Archive/92 Historical/92.02 Legacy Systems"
    fi
}

# Main execution
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     Johnny Decimal Folder Structure Creator for macOS            ║"
echo "║                    Personal System Setup                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if iCloud Drive is accessible
if [ -d "$HOME/Library/Mobile Documents/com~apple~CloudDocs" ]; then
    print_status "iCloud Drive detected"
else
    print_warning "iCloud Drive not found at expected location"
    print_info "You may need to adjust ICLOUD_BASE path"
fi

# Check for ProtonDrive (path may vary based on installation)
# Common locations for ProtonDrive on Mac
PROTON_PATHS=(
    "$HOME/Library/CloudStorage/ProtonDrive-jmeg8r@jmeg8r.com-folder"
    "$HOME/Library/CloudStorage/ProtonDrive"
    "$HOME/ProtonDrive"
    "/Volumes/ProtonDrive"
)

PROTON_FOUND=false
for path in "${PROTON_PATHS[@]}"; do
    if [ -d "$path" ]; then
        PROTON_BASE="$path/JohnnyDecimal"
        print_status "ProtonDrive detected at: $path"
        PROTON_FOUND=true
        break
    fi
done

if [ "$PROTON_FOUND" = false ]; then
    print_warning "ProtonDrive not found at expected locations"
    print_info "Will create placeholder. Adjust PROTON_BASE path and re-run if needed."
    PROTON_BASE="$HOME/ProtonDrive/JohnnyDecimal"
fi

echo ""
echo "Configuration:"
echo "  iCloud Base:    $ICLOUD_BASE"
echo "  ProtonDrive:    $PROTON_BASE"
echo ""

read -p "Proceed with folder creation? (y/n): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creating iCloud Drive Structure (Personal, ATGL, Development, Learning)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
create_jd_structure "$ICLOUD_BASE" "personal"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creating ProtonDrive Structure (Resistance - All Sensitive)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
create_jd_structure "$PROTON_BASE" "resistance"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_status "Johnny Decimal folder structure created successfully!"
echo ""
echo "Next Steps:"
echo "  1. Run the Windows script on your Alienware for Work OneDrive"
echo "  2. Set up email folder structure in Proton Mail"
echo "  3. Launch the JDex app to start managing your index"
echo "  4. Begin migrating existing files into the new structure"
echo ""
echo "Storage Map:"
echo "  📁 iCloud:      Personal, ATGL, Development, Learning, Archive"
echo "  🔒 ProtonDrive: Resistance (all sensitive)"
echo "  💼 Work OneDrive: UF Health (run Windows script)"
echo ""
