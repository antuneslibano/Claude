#!/usr/bin/env python3
"""
Agente de Computer Use — Controle autônomo do computador via Claude API
Uso: python agent.py "abra o Unity e crie um novo projeto"
"""

import anthropic
import pyautogui
import base64
import io
import os
import sys
import time
from PIL import ImageGrab

pyautogui.FAILSAFE = True   # Mover mouse para canto superior esquerdo para parar de emergência
pyautogui.PAUSE = 0.4


def get_screen_size():
    return pyautogui.size()


def take_screenshot():
    img = ImageGrab.grab()
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


KEY_MAP = {
    "Return": "enter", "BackSpace": "backspace", "Delete": "delete",
    "Escape": "esc", "Tab": "tab", "space": "space", "super": "win",
    "Left": "left", "Right": "right", "Up": "up", "Down": "down",
    "Home": "home", "End": "end", "Page_Up": "pageup", "Page_Down": "pagedown",
    "Print": "printscreen", "Insert": "insert",
    **{f"F{i}": f"f{i}" for i in range(1, 13)},
}


def parse_keys(key_string):
    return [KEY_MAP.get(k, k.lower()) for k in key_string.split("+")]


def execute_action(tool_input: dict):
    action = tool_input.get("action", "")
    try:
        if action == "screenshot":
            return ("image", take_screenshot())

        elif action == "mouse_move":
            x, y = tool_input["coordinate"]
            pyautogui.moveTo(x, y, duration=0.25)
            return ("text", f"Mouse em ({x},{y})")

        elif action == "left_click":
            x, y = tool_input["coordinate"]
            pyautogui.click(x, y)
            return ("text", f"Clique em ({x},{y})")

        elif action == "right_click":
            x, y = tool_input["coordinate"]
            pyautogui.rightClick(x, y)
            return ("text", f"Clique direito em ({x},{y})")

        elif action == "middle_click":
            x, y = tool_input["coordinate"]
            pyautogui.middleClick(x, y)
            return ("text", f"Clique do meio em ({x},{y})")

        elif action == "double_click":
            x, y = tool_input["coordinate"]
            pyautogui.doubleClick(x, y)
            return ("text", f"Duplo clique em ({x},{y})")

        elif action == "left_click_drag":
            sx, sy = tool_input["start_coordinate"]
            ex, ey = tool_input["coordinate"]
            pyautogui.moveTo(sx, sy)
            pyautogui.dragTo(ex, ey, duration=0.5, button="left")
            return ("text", f"Arrastou de ({sx},{sy}) para ({ex},{ey})")

        elif action == "type":
            text = tool_input["text"]
            pyautogui.write(text, interval=0.04)
            return ("text", f"Digitou: {text[:80]}")

        elif action == "key":
            keys = parse_keys(tool_input["key"])
            if len(keys) == 1:
                pyautogui.press(keys[0])
            else:
                pyautogui.hotkey(*keys)
            return ("text", f"Tecla: {tool_input['key']}")

        elif action == "scroll":
            x, y = tool_input["coordinate"]
            direction = tool_input.get("direction", "down")
            amount = tool_input.get("amount", 3)
            pyautogui.moveTo(x, y)
            if direction in ("left", "right"):
                pyautogui.hscroll(amount if direction == "right" else -amount)
            else:
                pyautogui.scroll(-amount if direction == "down" else amount)
            return ("text", f"Scroll {direction} em ({x},{y})")

        elif action == "cursor_position":
            x, y = pyautogui.position()
            return ("text", f"Cursor em ({x},{y})")

        elif action == "wait":
            ms = tool_input.get("duration", 1000)
            time.sleep(ms / 1000)
            return ("text", f"Aguardou {ms}ms")

        else:
            return ("text", f"Ação desconhecida: {action}")

    except Exception as e:
        return ("text", f"Erro em '{action}': {e}")


def build_tool_result(tool_use_id, result_type, result_data):
    if result_type == "image":
        content = [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": result_data}}]
    else:
        content = result_data
    return {"type": "tool_result", "tool_use_id": tool_use_id, "content": content}


def run_agent(task: str):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERRO: variável ANTHROPIC_API_KEY não definida.")
        print("Execute: $env:ANTHROPIC_API_KEY = 'sua-chave-aqui'")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    width, height = get_screen_size()

    print(f"Resolução: {width}x{height}")
    print(f"Tarefa: {task}")
    print("AVISO: Mova o mouse para o canto superior esquerdo para parar.\n")

    system = f"""Você é um agente autônomo controlando um computador Windows ({width}x{height}).
Regras:
- Comece sempre com um screenshot para ver o estado atual
- Seja preciso nas coordenadas de clique
- Aguarde apps carregarem antes de interagir
- Se algo falhar, tente alternativa
- Nunca execute ações destrutivas sem confirmar antes"""

    messages = [{"role": "user", "content": task}]
    tools = [{"type": "computer_20250124", "name": "computer", "display_width_px": width, "display_height_px": height}]

    for iteration in range(1, 51):
        print(f"\n--- Iteração {iteration} ---")

        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=4096,
            system=system,
            tools=tools,
            messages=messages,
            betas=["computer-use-2025-01-24"],
        )

        tool_uses = []
        for block in response.content:
            if hasattr(block, "text"):
                print(f"Agente: {block.text}")
            elif block.type == "tool_use":
                tool_uses.append(block)

        if response.stop_reason == "end_turn" and not tool_uses:
            print("\nTarefa concluída!")
            break

        if not tool_uses:
            break

        messages.append({"role": "assistant", "content": response.content})

        results = []
        for tu in tool_uses:
            action = tu.input.get("action", "?")
            print(f"Executando: {action} {tu.input}")
            rtype, rdata = execute_action(tu.input)
            results.append(build_tool_result(tu.id, rtype, rdata))

        messages.append({"role": "user", "content": results})
        time.sleep(0.3)
    else:
        print("Limite de 50 iterações atingido.")


if __name__ == "__main__":
    print("=== Agente Computer Use — Claude ===\n")
    task = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else input("Tarefa: ").strip()
    if not task:
        print("Nenhuma tarefa informada.")
        sys.exit(1)
    confirm = input(f"\nExecutar: '{task}'? (s/n): ")
    if confirm.lower() != "s":
        print("Cancelado.")
        sys.exit(0)
    run_agent(task)
