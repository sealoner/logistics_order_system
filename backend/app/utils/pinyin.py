from pypinyin import pinyin, Style


def name_to_pinyin(name: str) -> str:
    py_list = pinyin(name, style=Style.NORMAL)
    return "".join([item[0] for item in py_list]).lower()


def generate_username(name: str, existing_usernames: set[str]) -> str:
    base = name_to_pinyin(name)
    if base not in existing_usernames:
        return base
    i = 2
    while f"{base}{i}" in existing_usernames:
        i += 1
    return f"{base}{i}"