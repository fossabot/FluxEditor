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

import { appWindow } from "@tauri-apps/api/window";
import {
  IconClone,
  IconClose,
  IconNew,
  IconOpen,
} from "../components/Icons/Icons.tsx";
import ButtonIcon from "../ui/ButtonIcon";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Dropdown from "../ui/Dropdown";
import Input from "../ui/Input";
import ButtonBg from "../ui/ButtonBg";
import { dialog, fs } from "@tauri-apps/api";
import { Show, createSignal, onMount } from "solid-js";
import { cloneRepo, getRepoPath } from "../utils/git.ts";
import { checkDirValidity } from "../utils/dir.ts";
import { getOS } from "../utils/os.ts";
import { loadEditor } from "./Editor.tsx";
import path from "path-browserify";
import { error, info, warn } from "tauri-plugin-log-api";
import { IconFlux } from "../components/Icons/FluxIcon.tsx";

const Welcome = () => {
  const [selectedType, setSelectedType] = createSignal<string>("File");
  // used as directory path for new open, and clone functions
  const [dirPath, setDirPath] = createSignal<string>("");
  const [name, setName] = createSignal<string>("");

  const [isCloning, setIsCloning] = createSignal<boolean>(false);
  const [closeModal, setCloseModal] = createSignal(false);

  const [currentOS, setCurrentOS] = createSignal();

  onMount(async () => {
    setCurrentOS(await getOS());
    info("Mounted welcome screen");
  });

  const resetValues = () => {
    setSelectedType("File");
    setDirPath("");
    setName("");
  };

  const openDir = async (notNew?: boolean) => {
    dialog.open({ directory: true, multiple: false }).then((path) => {
      if (path) {
        setDirPath(path.toString() + "/");
      }

      if (notNew) {
        openEditor("open");
      }
    });
  };

  const clone = async () => {
    if (dirPath() != "") {
      try {
        setIsCloning(true);
        await cloneRepo(dirPath());
        setIsCloning(false);
        openEditor("clone");
      } catch (e) {
        dialog.message(`${e}`, {
          title: "Failed to clone repository",
          type: "error",
        });
        error(`Error cloning repository: ${e}`);
      }
    } else {
      dialog.message("Please enter a valid URL.", {
        title: "Failed to clone repository",
        type: "error",
      });
      warn("Invalid URL");
    }
  };

  const openEditor = async (action: string) => {
    if (action === "new") {
      if (name() === "") {
        dialog.message(
          "Please enter a valid " +
            selectedType().toLocaleLowerCase() +
            " name.",
          { title: "Error", type: "error" },
        );
        warn("Invalid " + selectedType().toLocaleLowerCase() + " name");
      } else if (dirPath() === "" || checkDirValidity(dirPath()) === false) {
        dialog.message("Please select a valid directory.", {
          title: "Error",
          type: "error",
        });
        warn("Invalid directory");
      } else {
        switch (selectedType()) {
          case "File":
            if (await fs.exists(path.join(dirPath() + name()))) {
              dialog.message("File already exists.", {
                title: "Error",
                type: "error",
              });
              warn("File " + name() + " already exists in " + dirPath());
              return;
            }
            fs.writeFile(path.join(dirPath(), name()), "").catch((e) => {
              error("Failed to create file " + name() + ": " + e);
            });
            break;
          case "Project":
            if (await fs.exists(path.join(dirPath(), name()))) {
              dialog.message("Directory already exists.", {
                title: "Error",
                type: "error",
              });
              warn("Directory " + name() + " already exists in " + dirPath());
            } else {
              fs.createDir(path.join(dirPath() + name()));
            }
        }

        if (selectedType() === "File") {
          loadEditor(path.join(dirPath(), name()), true, name());
          return;
        }

        const projectPath = path.join(dirPath(), name());

        const fluxConfig = {
          type: selectedType(),
        };

        const json = JSON.stringify(fluxConfig, null, 2);

        if (!(await fs.exists(path.join(projectPath, ".fluxeditor")))) {
          fs.createDir(path.join(projectPath, ".fluxeditor"));
        }

        fs.writeFile(path.join(projectPath, ".fluxeditor", "config.json"), json)
          .then(() => {
            loadEditor(projectPath);
          })
          .catch((e) => {
            error("Error creating config.json: " + e);
          });
      }
    } else if (action === "open") {
      if (dirPath() != "") {
        loadEditor(dirPath());
      }
    } else if (action === "clone") {
      if (dirPath() != "") {
        loadEditor(getRepoPath());
      }
    }
  };

  return (
    <div class="h-full select-none bg-base-200">
      {/* logo and title */}
      <div class="relative top-[12vh] flex items-center justify-center space-x-10">
        <div class="fill-primary" style={{ width: "140px", height: "auto" }}>
          <IconFlux />
        </div>
        <h1 class="text-8xl text-content">Flux Editor</h1>
      </div>
      {/* new-modal */}
      <dialog id="modal-new">
        <Modal
          width={60}
          height={60}
          class={`bg-base-200 ${closeModal() ? "dialog-close" : ""}`}
        >
          <div class="flex-col space-y-4">
            <div class="flex items-center space-x-3">
              <p class="text-xl text-content">New </p>
              <Dropdown
                items={["File", "Project"]}
                placeholder="File"
                width="110px"
                height="40px"
                selectedItem={setSelectedType}
              ></Dropdown>
            </div>
            <div class="flex items-center space-x-3">
              <p class="text-xl text-content">Name</p>
              <Input
                width="100%"
                height="40px"
                placeholder="e.g. helloworld"
                value=""
                onChange={setName}
              />
            </div>
            <div class="flex items-center space-x-3">
              <p class="text-xl text-content">Directory</p>
              <Input
                width="100%"
                height="40px"
                placeholder="e.g. /users/me/"
                value={dirPath()}
                onChange={setDirPath}
              />
              <ButtonBg
                text="Browse"
                width="calc(80px + 2em)"
                height="40px"
                action={() => openDir(false)}
              />
            </div>
          </div>
          <div
            class="flex space-x-[12px]"
            style={{
              position: "absolute",
              bottom: `calc(20% + 1.5em)`,
              right: `calc(20% + 1.5em)`,
            }}
          >
            <ButtonBg
              text="Cancel"
              width="80px"
              height="40px"
              action={() => {
                resetValues();
                const modal = document.getElementById(
                  "modal-new",
                ) as HTMLDialogElement;

                setCloseModal(true);
                setTimeout(() => {
                  if (modal) {
                    modal.close();
                  }
                  setCloseModal(false);
                }, 200);
              }}
            />
            <Button
              text="Create"
              width={80}
              height={40}
              action={() => {
                openEditor("new");
              }}
            />
          </div>
        </Modal>
      </dialog>
      {/* clone-modal */}
      <dialog id="modal-clone">
        <Modal
          width={60}
          height={35}
          class={`bg-base-200 ${closeModal() ? "dialog-close" : ""}`}
        >
          <div class="flex-col space-y-3">
            <div class="flex items-center space-x-3">
              <p class="inline-block text-xl text-content">URL</p>
              <Input
                width="100%"
                height="40px"
                placeholder="e.g. https://github.com/kyteidev/fluxeditor.git"
                value=""
                onChange={setDirPath}
              />
            </div>
          </div>
          <div
            class="flex space-x-[12px]"
            style={{
              position: "absolute",
              bottom: `calc(32.5% + 1.5em)`,
              right: `calc(20% + 1.5em)`,
            }}
          >
            <ButtonBg
              text="Cancel"
              width="80px"
              height="40px"
              action={() => {
                resetValues();
                const modal = document.getElementById(
                  "modal-clone",
                ) as HTMLDialogElement;
                setCloseModal(true);
                setTimeout(() => {
                  if (modal) {
                    modal.close();
                  }
                  setCloseModal(false);
                }, 200);
              }}
            />
            <Button
              text="Clone"
              width={80}
              height={40}
              loading={isCloning()}
              action={clone}
            />
          </div>
        </Modal>
      </dialog>
      {/* buttons */}
      <div class="relative top-[30vh] h-full w-full">
        <div class="flex justify-center space-x-20">
          {/* New button */}
          <div>
            <ButtonIcon
              size="100px"
              rounding={50}
              icon={IconNew}
              action={() => {
                resetValues();
                const modal = document.getElementById(
                  "modal-new",
                ) as HTMLDialogElement;
                if (modal) {
                  modal.showModal();
                }
              }}
            />
            <p class="relative top-2 text-center text-content">New...</p>
          </div>
          {/* Open button */}
          <div>
            <ButtonIcon
              size="100px"
              rounding={50}
              icon={IconOpen}
              action={openDir}
            />
            <p class="relative top-2 text-center text-content">Open...</p>
          </div>
          {/* Clone button */}
          <div>
            <ButtonIcon
              size="100px"
              rounding={50}
              icon={IconClone}
              action={() => {
                const modal = document.getElementById(
                  "modal-clone",
                ) as HTMLDialogElement;
                if (modal) {
                  modal.showModal();
                }
              }}
            />
            <p class="relative top-2 text-center text-content">Clone...</p>
          </div>
        </div>
      </div>
      <Show when={currentOS() != "darwin"}>
        <div class="absolute right-4 top-4 ml-0">
          <button
            class="transition ease-in-out hover:opacity-70"
            onClick={() => appWindow.close()}
          >
            <div class="flex h-9 w-9 justify-center">
              <IconClose />
            </div>
          </button>
        </div>
      </Show>
    </div>
  );
};

export default Welcome;
