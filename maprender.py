import pygame
import json
import sys
import os
from typing import Dict, List, Any

class MapEditor:
    def __init__(self, width=1200, height=800):
        pygame.init()
        self.screen = pygame.display.set_mode((width, height))
        pygame.display.set_caption("JSON Map Editor")
        self.clock = pygame.time.Clock()
        
        self.objects_config = {}
        self.current_map = {
            "width": 100,
            "height": 100,
            "objects": []
        }
        
        self.selected_object_type = "wall"
        self.grid_size = 32
        self.camera_x = 0
        self.camera_y = 0
        self.dragging = False
        self.last_mouse_pos = (0, 0)
        
        self.colors = {
            "background": (40, 40, 40),
            "grid": (80, 80, 80),
            "panel": (60, 60, 60),
            "text": (255, 255, 255)
        }
        
        self.load_default_objects()
    
    def load_default_objects(self):
        # Загрузка стандартных объектов как в примере
        self.objects_config = {
            "player": {
                "modules": ["sprite", "move", "camera", "collision"],
                "params": {
                    "color": "#FF0000",
                    "size": 2,
                    "speed": 1,
                    "followSpeed": 0.1,
                    "smooth": True,
                    "width": 500,
                    "height": 500,
                    "collidable": True,
                    "solid": True,
                    "checkCollision": True
                }
            },
            "wall": {
                "modules": ["square", "collision"],
                "params": {
                    "color": "#3333FF",
                    "size": 2,
                    "collidable": True,
                    "solid": True
                }
            },
            "box": {
                "modules": ["square", "collision"],
                "params": {
                    "color": "#11FF11",
                    "size": 3,
                    "collidable": True,
                    "solid": False
                }
            },
            "trawa": {
                "modules": ["square", "collision"],
                "params": {
                    "color": "#305530",
                    "size": 30,
                    "collidable": True,
                    "solid": False
                }
            }
        }
    
    def load_objects_config(self, filepath):
        try:
            with open(filepath, 'r') as f:
                self.objects_config = json.load(f)
            print(f"Loaded objects config from {filepath}")
        except Exception as e:
            print(f"Error loading config: {e}")
    
    def save_map(self, filepath):
        try:
            with open(filepath, 'w') as f:
                json.dump(self.current_map, f, indent=2)
            print(f"Map saved to {filepath}")
        except Exception as e:
            print(f"Error saving map: {e}")
    
    def hex_to_rgb(self, hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def get_object_color(self, obj_type):
        if obj_type in self.objects_config:
            color_hex = self.objects_config[obj_type]["params"].get("color", "#FFFFFF")
            return self.hex_to_rgb(color_hex)
        return (255, 255, 255)
    
    def get_object_size(self, obj_type):
        if obj_type in self.objects_config:
            return self.objects_config[obj_type]["params"].get("size", 2)
        return 2
    
    def world_to_screen(self, x, y):
        screen_x = (x - self.camera_x) * self.grid_size
        screen_y = (y - self.camera_y) * self.grid_size
        return screen_x, screen_y
    
    def screen_to_world(self, screen_x, screen_y):
        world_x = screen_x / self.grid_size + self.camera_x
        world_y = screen_y / self.grid_size + self.camera_y
        return world_x, world_y
    
    def add_object(self, obj_type, x, y):
        # Округляем координаты до целых
        x = int(x)
        y = int(y)
        
        # Проверяем, нет ли уже объекта на этой позиции
        for obj in self.current_map["objects"]:
            if obj["x"] == x and obj["y"] == y:
                return
        
        self.current_map["objects"].append({
            "name": obj_type,
            "x": x,
            "y": y
        })
    
    def remove_object(self, x, y):
        x = int(x)
        y = int(y)
        
        self.current_map["objects"] = [
            obj for obj in self.current_map["objects"]
            if not (obj["x"] == x and obj["y"] == y)
        ]
    
    def draw_grid(self):
        for x in range(0, self.screen.get_width(), self.grid_size):
            pygame.draw.line(self.screen, self.colors["grid"], 
                           (x, 0), (x, self.screen.get_height()), 1)
        for y in range(0, self.screen.get_height(), self.grid_size):
            pygame.draw.line(self.screen, self.colors["grid"],
                           (0, y), (self.screen.get_width(), y), 1)
    
    def draw_objects(self):
        for obj in self.current_map["objects"]:
            obj_type = obj["name"]
            x, y = self.world_to_screen(obj["x"], obj["y"])
            size = self.get_object_size(obj_type) * self.grid_size
            
            color = self.get_object_color(obj_type)
            pygame.draw.rect(self.screen, color, (x, y, size, size))
            
            # Обводка для видимости
            pygame.draw.rect(self.screen, (255, 255, 255), (x, y, size, size), 1)
    
    def draw_ui(self):
        # Панель инструментов
        panel_rect = pygame.Rect(10, 10, 200, 400)
        pygame.draw.rect(self.screen, self.colors["panel"], panel_rect)
        pygame.draw.rect(self.screen, self.colors["text"], panel_rect, 2)
        
        font = pygame.font.Font(None, 36)
        title = font.render("Map Editor", True, self.colors["text"])
        self.screen.blit(title, (20, 20))
        
        # Кнопки объектов
        y_offset = 60
        for obj_type in self.objects_config.keys():
            color = self.get_object_color(obj_type)
            button_rect = pygame.Rect(20, y_offset, 180, 40)
            
            # Подсветка выбранного объекта
            if obj_type == self.selected_object_type:
                pygame.draw.rect(self.screen, (100, 100, 100), button_rect)
            
            pygame.draw.rect(self.screen, color, (25, y_offset + 5, 30, 30))
            
            text = pygame.font.Font(None, 24).render(obj_type, True, self.colors["text"])
            self.screen.blit(text, (65, y_offset + 10))
            
            y_offset += 50
        
        # Информация
        info_text = [
            f"Objects: {len(self.current_map['objects'])}",
            f"Grid: {self.grid_size}px",
            "LMB: Place object",
            "RMB: Remove object",
            "Mouse wheel: Zoom",
            "WASD: Move camera",
            "Ctrl+S: Save map",
            "Ctrl+L: Load config"
        ]
        
        y_offset = 450
        for line in info_text:
            text = pygame.font.Font(None, 20).render(line, True, self.colors["text"])
            self.screen.blit(text, (20, y_offset))
            y_offset += 25
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # ЛКМ
                    mouse_x, mouse_y = pygame.mouse.get_pos()
                    world_x, world_y = self.screen_to_world(mouse_x, mouse_y)
                    
                    # Проверяем клик по UI
                    if mouse_x > 220:  # Не в панели инструментов
                        self.add_object(self.selected_object_type, world_x, world_y)
                    else:
                        # Выбор объекта из панели
                        y_offset = 60
                        for obj_type in self.objects_config.keys():
                            button_rect = pygame.Rect(20, y_offset, 180, 40)
                            if button_rect.collidepoint(mouse_x, mouse_y):
                                self.selected_object_type = obj_type
                                break
                            y_offset += 50
                
                elif event.button == 3:  # ПКМ
                    mouse_x, mouse_y = pygame.mouse.get_pos()
                    if mouse_x > 220:
                        world_x, world_y = self.screen_to_world(mouse_x, mouse_y)
                        self.remove_object(world_x, world_y)
                
                elif event.button == 4:  # Колесо вверх
                    self.grid_size = min(64, self.grid_size + 4)
                
                elif event.button == 5:  # Колесо вниз
                    self.grid_size = max(8, self.grid_size - 4)
            
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_s and pygame.key.get_mods() & pygame.KMOD_CTRL:
                    self.save_map("map.json")
                
                elif event.key == pygame.K_l and pygame.key.get_mods() & pygame.KMOD_CTRL:
                    # Загрузка конфига объектов
                    self.load_objects_config("objects.json")
        
        # Управление камерой
        keys = pygame.key.get_pressed()
        camera_speed = 10 / self.grid_size
        
        if keys[pygame.K_w]:
            self.camera_y -= camera_speed
        if keys[pygame.K_s]:
            self.camera_y += camera_speed
        if keys[pygame.K_a]:
            self.camera_x -= camera_speed
        if keys[pygame.K_d]:
            self.camera_x += camera_speed
        
        return True
    
    def run(self):
        running = True
        while running:
            self.screen.fill(self.colors["background"])
            
            running = self.handle_events()
            
            self.draw_grid()
            self.draw_objects()
            self.draw_ui()
            
            pygame.display.flip()
            self.clock.tick(60)
        
        pygame.quit()

if __name__ == "__main__":
    editor = MapEditor()
    editor.run()