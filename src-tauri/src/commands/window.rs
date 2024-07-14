/*
Copyright © 2024 The Flux Editor Contributors.

This file is part of Flux Editor.

Flux Editor is free software: you can redistribute it and/or modify it under the terms of the GNU General
Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

Flux Editor is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Flux Editor. If not, see
<https://www.gnu.org/licenses/>.
*/

use tauri::WindowBuilder;

use crate::{utils::time::time_ms, window_ext::WindowExt};

#[cfg(any(windows))]
use window_shadows::set_shadow;

#[tauri::command]
pub async fn new_window(app: tauri::AppHandle) {
    let id = time_ms();
    WindowBuilder::new(
        &app,
        id.to_string(),
        tauri::WindowUrl::App("index.html".into()),
    )
    .title("Flux Editor")
    .decorations(false)
    .inner_size(960., 620.)
    .min_inner_size(660., 450.)
    .build()
    .unwrap();

    #[cfg(any(windows))]
    set_shadow(&win, true).unwrap();

    /*
    #[cfg(target_os = "macos")]
    {
        win.set_transparent_titlebar(true, false);
        win.set_window_controls_pos(10., 12.5);
    }
    */
}
