# Needs improvement to function reliably

import re
import json
from PyPDF2 import PdfReader

def read_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def clean_course_id(course_id):
    return course_id.replace(" ", "")

def parse_terms(term_string):
    if not term_string:
        return []
    
    terms = []
    term_parts = re.split(r'\s*[&,]\s*', term_string)
    
    for part in term_parts:
        part = part.strip()
        if part and part in ["Fall", "Spring", "Summer", "Occasionally", "By Permission"]:
            terms.append(part)
    
    return terms

def extract_course_ids(text):
    course_id_pattern = re.compile(r'([A-Z]+\s*\d+)')
    return [clean_course_id(match.group(1)) for match in course_id_pattern.finditer(text)]

def identify_sections(text):
    sections = {}
    
    section_pattern = re.compile(
        r'^([A-Za-z\s-]+(?:Courses|Course|Units:))\s*\n*\s*(\d+(?:-\d+)?)\s*Units',
        re.MULTILINE
    )
    
    for match in section_pattern.finditer(text):
        section_name = match.group(1).strip()
        credit_value = match.group(2)
        
        section_key = section_name.lower()\
            .replace(" courses", "")\
            .replace(" course", "")\
            .replace(":", "")\
            .replace(" ", "_")\
            .replace("-", "_")
        
        if '-' in credit_value:
            min_val, max_val = map(int, credit_value.split('-'))
            sections[section_key] = {"min": min_val, "max": max_val}
        else:
            sections[section_key] = int(credit_value)
    
    return sections

def extract_course_info(text, course_id):
    course_pattern = re.compile(
        rf'{course_id}\s+([^F\n]+?)\s+((?:Fall|Spring|Summer|Occasionally|By Permission)(?:\s*(?:&|,)\s*(?:Fall|Spring|Summer))*)'
    )
    
    match = course_pattern.search(text)
    if match:
        prereqs_text, offerings_text = match.groups()
        prerequisites = extract_course_ids(prereqs_text)
        offerings = parse_terms(offerings_text)
    else:
        prerequisites = []
        offerings = []
    
    return {
        "prerequisites": prerequisites,
        "offerings": offerings
    }

def extract_flowchart_relationships(text):
    flowchart = {
        "nodes": {},
        "edges": []
    }
    
    course_pattern = re.compile(
        r'([A-Z]+\s*\d+)\s*(?:\n|\s)*([^A-Z\n]+?)(?=(?:[A-Z]|\n|$))'
    )
    
    for match in course_pattern.finditer(text):
        course_id, offering_text = match.groups()
        course_id = clean_course_id(course_id)
        
        offerings = parse_terms(offering_text)
        
        flowchart["nodes"][course_id] = {
            "id": course_id,
            "offerings": offerings
        }
    
    lines = text.split('\n')
    current_course = None
    
    for line in lines:
        course_match = re.search(r'([A-Z]+\s*\d+)', line)
        if course_match:
            current_course = clean_course_id(course_match.group(1))
            
            prereq_matches = re.finditer(r'([A-Z]+\s*\d+)', line)
            prereqs = [clean_course_id(m.group(1)) for m in prereq_matches]
            
            if len(prereqs) > 1:
                for prereq in prereqs[1:]:
                    flowchart["edges"].append({
                        "from": prereq,
                        "to": current_course,
                        "type": "prerequisite"
                    })
    
    coreq_pattern = re.compile(r'Co-(?:Req|Requisite)\s*([A-Z]+\s*\d+)')
    
    for match in coreq_pattern.finditer(text):
        coreq = clean_course_id(match.group(1))
        context = text[max(0, match.start() - 100):match.start()]
        course_match = re.search(r'([A-Z]+\s*\d+)', context)
        if course_match:
            target_course = clean_course_id(course_match.group(1))
            flowchart["edges"].append({
                "from": coreq,
                "to": target_course,
                "type": "corequisite"
            })
    
    return flowchart

def parse_course_line(line):
    course_pattern = re.compile(r'_{5}\s*([A-Z]+\s*\d+)\s+([^0-9\n]+?)\s+(\d+)')
    match = course_pattern.match(line)
    
    if match:
        course_id, name, credits = match.groups()
        return {
            "id": clean_course_id(course_id),
            "name": name.strip(),
            "credits": int(credits)
        }
    return None

def process_pdf(text):
    sections = identify_sections(text)
    
    result = {
        "creditRequirements": sections,
        "courses": [],
        "courseGroups": {
            "group_a": {
                "requirement": "At least 2 of the following",
                "courses": []
            },
            "group_b": {
                "requirement": "At least 2 of the following",
                "courses": []
            }
        }
    }
    
    current_section = None
    current_group = None
    lines = text.split('\n')
    
    for line in lines:
        if re.search(r'Courses?\s*\n*\s*\d+(?:-\d+)?\s*Units', line):
            current_section = line.split('(')[0].strip().lower()\
                .replace(" courses", "")\
                .replace(" ", "_")
            current_group = None
            continue
        
        if line.strip().startswith("Group"):
            current_group = line.split('-')[0].strip().lower().replace(" ", "_")
            continue
        
        course_info = parse_course_line(line)
        if course_info:
            course_info["section"] = current_section
            if current_group:
                course_info["group"] = current_group
                group_key = current_group.replace("group_", "group_")
                if group_key in result["courseGroups"]:
                    result["courseGroups"][group_key]["courses"].append(course_info["id"])
            
            additional_info = extract_course_info(text, course_info["id"])
            course_info.update(additional_info)
            
            result["courses"].append(course_info)
    
    result["flowchart"] = extract_flowchart_relationships(text)
    
    return result

def process_pdf_to_json(pdf_path, json_path):
    text = read_pdf(pdf_path)
    result = process_pdf(text)
    
    with open(json_path, 'w', encoding='utf-8') as json_file:
        json.dump(result, json_file, indent=4)

if __name__ == "__main__":
    pdf_path = 'cs-major-23-24-update.pdf'
    json_path = 'courses.json'
    process_pdf_to_json(pdf_path, json_path)