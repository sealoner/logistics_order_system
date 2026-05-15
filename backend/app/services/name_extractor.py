import re


def extract_student_name(source: str) -> str:
    if not source:
        return ""

    pattern = r"亚马逊\s+(.+?)\s*\("
    match = re.search(pattern, source)
    if match:
        return match.group(1).strip()

    prefix = "亚马逊 "
    if source.startswith(prefix):
        name_part = source[len(prefix):]
        paren_idx = name_part.find("(")
        if paren_idx > 0:
            return name_part[:paren_idx].strip()
        return name_part.strip()

    return source.strip()