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

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

mod menu;
use menu::menu;

use lsp_client::{init_server, install_server, send_request};
use serde_json::{json, Value};
use tauri::{Manager, Window, WindowEvent};
use tauri_plugin_log::LogTarget;

#[cfg(target_os = "macos")]
use cocoa::appkit::NSWindow;
#[cfg(target_os = "macos")]
use cocoa::base::id;
#[cfg(target_os = "macos")]
use objc::runtime::{NO, YES};
#[cfg(target_os = "windows")]
use window_shadows::set_shadow;

#[cfg(target_os = "macos")]
use window_ext::WindowExt;

#[cfg(target_os = "macos")]
mod window_ext;

mod commands;
use commands::{
    git::clone_repo,
    path::{app_data_dir, resolve_resource, user_home_dir},
    window::new_window,
};

mod utils;
use utils::dir::{get_app_log_dir, get_ls_dir};

mod lsp_client;

#[tauri::command]
fn set_doc_edited(window: Window, edited: bool) {
    #[cfg(target_os = "macos")]
    {
        let ns_window: id = window.ns_window().unwrap() as id;
        unsafe { ns_window.setDocumentEdited_(if edited { YES } else { NO }) }
        window.set_window_controls_pos(10., 12.5)
    }
}

#[tauri::command]
async fn ls_send_request(id: &str, method: &str, params: Value) -> Result<String, String> {
    init_server(get_ls_dir(), "typescript");

    let request = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    });

    let response = send_request(serde_json::to_string(&request).unwrap().as_str()).unwrap();

    #[cfg(debug_assertions)]
    println!("Received response: {:?}", response);

    Ok(response)
}

fn main() {
    #[cfg(not(any(windows)))]
    fix_path_env::fix().unwrap();

    #[cfg(debug_assertions)]
    let log_targets: [LogTarget; 3] = [
        LogTarget::Stdout,
        LogTarget::Webview,
        LogTarget::Folder(get_app_log_dir()),
    ];

    #[cfg(not(debug_assertions))]
    let log_targets: [LogTarget; 2] = [LogTarget::Stdout, LogTarget::Folder(get_app_log_dir())];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets(log_targets)
                .log_name("main")
                .build(),
        )
        .setup(|app| {
            /*
            install_server(get_ls_dir(), "typescript"); // temporary for testing purposes
            */

            let win = app.get_window("main").unwrap();

            #[cfg(target_os = "macos")]
            win.set_transparent_titlebar(true, false);

            #[cfg(target_os = "macos")]
            win.set_window_controls_pos(10., 12.5);

            #[cfg(any(windows))]
            set_shadow(&win, true).unwrap();

            Ok(())
        })
        .on_window_event(|e| {
            // [start] source: https://github.com/tauri-apps/tauri/issues/4789#issuecomment-1387243148

            #[cfg(target_os = "macos")]
            let apply_offset = || {
                let win = e.window();
                win.set_window_controls_pos(10., 12.5);
            };

            #[cfg(target_os = "macos")]
            match e.event() {
                WindowEvent::Resized(..) => apply_offset(),
                WindowEvent::ThemeChanged(..) => apply_offset(),
                _ => {}
            }
            // [end]
        })
        .on_menu_event(|event| {
            event
                .window()
                .emit(&("flux:".to_owned() + event.menu_item_id()), "")
                .unwrap();
        })
        .menu(menu())
        .invoke_handler(tauri::generate_handler![
            clone_repo,
            set_doc_edited,
            ls_send_request,
            app_data_dir,
            user_home_dir,
            resolve_resource,
            new_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
