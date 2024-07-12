import { createSignal } from "solid-js";
import Button from "../../ui/Button";
import ButtonBg from "../../ui/ButtonBg";
import Dropdown from "../../ui/Dropdown";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";
import { dialog, fs } from "@tauri-apps/api";
import { cloneRepo, getRepoPath } from "../../utils/git";
import { error, warn } from "tauri-plugin-log-api";
import { loadEditor } from "../../App";
import { checkDirPathValidity, joinPath } from "../../utils/path";

const Startup = () => {
  const [isCloning, setIsCloning] = createSignal<boolean>(false);
  const [closeModal, setCloseModal] = createSignal(false);
  const [selectedType, setSelectedType] = createSignal<string>("File");
  // used as directory path for new open, and clone functions
  const [dirPath, setDirPath] = createSignal<string>("");
  const [name, setName] = createSignal<string>("");

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
        beforeLoad("open");
      }
    });
  };

  const clone = async () => {
    if (dirPath() != "") {
      try {
        setIsCloning(true);
        await cloneRepo(dirPath());
        setIsCloning(false);
        beforeLoad("clone");
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
      warn("Invalid URL provided for cloning");
    }
  };

  const beforeLoad = async (action: string) => {
    switch (action) {
      case "new":
        if (name() === "") {
          dialog.message(
            "Please enter a valid " +
              selectedType().toLocaleLowerCase() +
              " name.",
            { title: "Error", type: "error" },
          );
          warn("Invalid " + selectedType().toLocaleLowerCase() + " name");
        } else if (
          dirPath() === "" ||
          checkDirPathValidity(dirPath()) === false
        ) {
          dialog.message("Please select a valid directory.", {
            title: "Error",
            type: "error",
          });
          warn("Invalid directory");
        } else {
          switch (selectedType()) {
            case "File":
              if (await fs.exists(joinPath(dirPath() + name()))) {
                dialog.message("File already exists.", {
                  title: "Error",
                  type: "error",
                });
                warn("File " + name() + " already exists in " + dirPath());
                return;
              }
              fs.writeFile(joinPath(dirPath(), name()), "").catch((e) => {
                error("Failed to create file " + name() + ": " + e);
              });
              loadEditor(joinPath(dirPath(), name()), true, name());
              break;
            case "Project":
              if (await fs.exists(joinPath(dirPath(), name()))) {
                dialog.message("Directory already exists.", {
                  title: "Error",
                  type: "error",
                });
                warn("Directory " + name() + " already exists in " + dirPath());
              } else {
                const projectPath = joinPath(dirPath(), name());

                await fs.createDir(projectPath);
                loadEditor(projectPath);
              }
          }
        }
        break;
      case "open":
        if (dirPath() != "") {
          loadEditor(dirPath());
        }
        break;
      case "clone":
        if (dirPath() != "") {
          loadEditor(getRepoPath());
        }
        break;
    }
  };

  return (
    <div class="flex flex-col space-y-2 px-2 py-1">
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
                action={() => {
                  openDir(false);
                }}
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
                beforeLoad("new");
              }}
            />
          </div>
        </Modal>
      </dialog>
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
      <Button
        width={100}
        height={25}
        text="New"
        action={() => {
          const modal = document.getElementById(
            "modal-new",
          ) as HTMLDialogElement;
          if (modal) {
            modal.showModal();
          }
        }}
      />
      <Button width={100} height={25} text="Open" action={openDir} />
      <Button
        width={100}
        height={25}
        text="Clone"
        action={() => {
          const modal = document.getElementById(
            "modal-clone",
          ) as HTMLDialogElement;
          if (modal) {
            modal.showModal();
          }
        }}
      />
    </div>
  );
};

export default Startup;