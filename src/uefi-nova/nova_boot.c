/**
 * ============================================================================
 * NOVA UEFI x64 Boot Manager - Production Dual-Boot
 * ============================================================================
 * Architecture : x86_64 UEFI PE32+
 * Cibles       : macOS (OpenCore sur LDLC F7) & Windows Boot Manager (sur KXG6A)
 * Configuration: Lecture réelle de EFI/NOVA/config.ini
 * ============================================================================
 */

#include <efi.h>
#include <efilib.h>
#include "font8x8_basic.h"

#define MAX_TARGETS 4
#define INI_BUF_SIZE 16384

typedef struct {
    CHAR16  Name[64];
    CHAR16  Subtitle[64];
    CHAR16  DiskHint[96];
    CHAR16  FilePath[128];
    BOOLEAN Available;
    EFI_HANDLE DeviceHandle;
    EFI_DEVICE_PATH_PROTOCOL *DevicePath;
} BOOT_TARGET;

static BOOT_TARGET Targets[MAX_TARGETS];
static UINTN TargetCount = 2;
static UINTN SelectedIndex = 0;
static INT32 BootTimeout = 0; // 0 = Pas de compte a rebours, attend le choix utilisateur
static CHAR16 ManagerTitle[64] = L"NOVA Boot Manager";

// Contexte graphique
static EFI_GRAPHICS_OUTPUT_PROTOCOL *Gop = NULL;
static UINT32 ScreenWidth = 0;
static UINT32 ScreenHeight = 0;
static EFI_GRAPHICS_OUTPUT_BLT_PIXEL *BackBuffer = NULL;

// Palette (Thème Dark Slate & Ambre)
#define COLOR_BG          0x07090F
#define COLOR_HEADER_BG   0x0D111D
#define COLOR_CARD_NORMAL 0x111624
#define COLOR_CARD_SELECT 0x1A2238
#define COLOR_TEXT_WHITE  0xFFFFFF
#define COLOR_TEXT_MUTED  0x94A3B8
#define COLOR_ACCENT      0xF59E0B
#define COLOR_BORDER_SEL  0xFBBF24
#define COLOR_BORDER_NORM 0x242D45
#define COLOR_APPLE_BLUE  0x38BDF8
#define COLOR_WIN_AZURE   0x0078D4

static void InitDefaultTargets(void) {
    StrCpy(Targets[0].Name, L"macOS");
    StrCpy(Targets[0].Subtitle, L"OpenCore Loader");
    StrCpy(Targets[0].DiskHint, L"Disque LDLC F7 (Volume EFICORE)");
    StrCpy(Targets[0].FilePath, L"\\EFI\\OC\\OpenCore.efi");
    Targets[0].Available = FALSE;
    Targets[0].DeviceHandle = NULL;
    Targets[0].DevicePath = NULL;

    StrCpy(Targets[1].Name, L"Windows Boot Manager");
    StrCpy(Targets[1].Subtitle, L"Windows Boot Manager");
    StrCpy(Targets[1].DiskHint, L"Disque KXG6A (Partition EFI)");
    StrCpy(Targets[1].FilePath, L"\\EFI\\Microsoft\\Boot\\bootmgfw.efi");
    Targets[1].Available = FALSE;
    Targets[1].DeviceHandle = NULL;
    Targets[1].DevicePath = NULL;

    TargetCount = 2;
    SelectedIndex = 0;
    BootTimeout = 0; // Pas d'auto-boot
}

// Nettoyage des espaces et retours charriot
static void TrimAscii(char *str) {
    int i = 0, j = 0;
    while (str[i] == ' ' || str[i] == '\t' || str[i] == '\r' || str[i] == '\n') i++;
    while (str[i] != '\0') {
        str[j++] = str[i++];
    }
    str[j] = '\0';
    while (j > 0 && (str[j - 1] == ' ' || str[j - 1] == '\t' || str[j - 1] == '\r' || str[j - 1] == '\n')) {
        str[--j] = '\0';
    }
}

// Conversion ASCII vers CHAR16
static void AsciiToUnicode(const char *src, CHAR16 *dst, UINTN maxChars) {
    UINTN i = 0;
    while (src[i] != '\0' && i + 1 < maxChars) {
        dst[i] = (CHAR16)src[i];
        i++;
    }
    dst[i] = 0;
}

/**
 * Analyse et lecture reelle du fichier EFI/NOVA/config.ini
 */
static EFI_STATUS ParseConfigIni(char *buffer, UINTN size) {
    char line[256];
    UINTN offset = 0;
    int currentSection = -1; // 0=General, 1=Entry_0, 2=Entry_1

    Print(L"[NOVA] Analyse reelle de config.ini (%d octets)...\n", size);

    while (offset < size) {
        UINTN lineLen = 0;
        while (offset + lineLen < size && buffer[offset + lineLen] != '\n' && lineLen < 254) {
            line[lineLen] = buffer[offset + lineLen];
            lineLen++;
        }
        line[lineLen] = '\0';
        if (offset + lineLen < size && buffer[offset + lineLen] == '\n') {
            lineLen++;
        }
        offset += lineLen;

        TrimAscii(line);
        if (line[0] == '\0' || line[0] == '#' || line[0] == ';') {
            continue;
        }

        // Section
        if (line[0] == '[') {
            if (AsciiStrnCmp(line, "[General]", 9) == 0) {
                currentSection = 0;
            } else if (AsciiStrnCmp(line, "[Entry_0]", 9) == 0) {
                currentSection = 1;
            } else if (AsciiStrnCmp(line, "[Entry_1]", 9) == 0) {
                currentSection = 2;
            } else {
                currentSection = -1;
            }
            continue;
        }

        // Cle = Valeur
        char *eq = strchr(line, '=');
        if (!eq) continue;
        *eq = '\0';
        char *key = line;
        char *val = eq + 1;
        TrimAscii(key);
        TrimAscii(val);

        if (currentSection == 0) {
            if (AsciiStrCmp(key, "Timeout") == 0) {
                BootTimeout = (INT32)Atoi(val);
                Print(L"[NOVA-CFG] Timeout configure: %d\n", BootTimeout);
            } else if (AsciiStrCmp(key, "Title") == 0) {
                AsciiToUnicode(val, ManagerTitle, 64);
            } else if (AsciiStrCmp(key, "Default") == 0) {
                if (AsciiStrCmp(val, "Windows") == 0 || AsciiStrCmp(val, "1") == 0) {
                    SelectedIndex = 1;
                } else {
                    SelectedIndex = 0;
                }
            }
        } else if (currentSection == 1) { // macOS
            if (AsciiStrCmp(key, "Name") == 0) {
                AsciiToUnicode(val, Targets[0].Name, 64);
            } else if (AsciiStrCmp(key, "Subtitle") == 0) {
                AsciiToUnicode(val, Targets[0].Subtitle, 64);
            } else if (AsciiStrCmp(key, "Path") == 0) {
                AsciiToUnicode(val, Targets[0].FilePath, 128);
            } else if (AsciiStrCmp(key, "DiskHint") == 0) {
                AsciiToUnicode(val, Targets[0].DiskHint, 96);
            }
        } else if (currentSection == 2) { // Windows
            if (AsciiStrCmp(key, "Name") == 0) {
                AsciiToUnicode(val, Targets[1].Name, 64);
            } else if (AsciiStrCmp(key, "Subtitle") == 0) {
                AsciiToUnicode(val, Targets[1].Subtitle, 64);
            } else if (AsciiStrCmp(key, "Path") == 0) {
                AsciiToUnicode(val, Targets[1].FilePath, 128);
            } else if (AsciiStrCmp(key, "DiskHint") == 0) {
                AsciiToUnicode(val, Targets[1].DiskHint, 96);
            }
        }
    }

    Print(L"[NOVA-CFG] Configuration validee: Cible 0='%s', Cible 1='%s'\n", Targets[0].Name, Targets[1].Name);
    return EFI_SUCCESS;
}

/**
 * Lecture du fichier EFI\NOVA\config.ini depuis le disque de boot
 */
static EFI_STATUS LoadConfigFromDisk(EFI_HANDLE ImageHandle) {
    EFI_STATUS Status;
    EFI_LOADED_IMAGE_PROTOCOL *LoadedImage = NULL;
    EFI_SIMPLE_FILE_SYSTEM_PROTOCOL *Fs = NULL;
    EFI_FILE_PROTOCOL *Root = NULL;
    EFI_FILE_PROTOCOL *ConfigFile = NULL;

    Status = BS->HandleProtocol(ImageHandle, &gEfiLoadedImageProtocolGuid, (void**)&LoadedImage);
    if (EFI_ERROR(Status) || !LoadedImage) {
        Print(L"[NOVA] Avertissement: Impossible de localiser LoadedImageProtocol (%r)\n", Status);
        return Status;
    }

    Status = BS->HandleProtocol(LoadedImage->DeviceHandle, &gEfiSimpleFileSystemProtocolGuid, (void**)&Fs);
    if (EFI_ERROR(Status) || !Fs) {
        Print(L"[NOVA] Avertissement: Pas de SimpleFileSystem sur le handle image (%r)\n", Status);
        return Status;
    }

    Status = Fs->OpenVolume(Fs, &Root);
    if (EFI_ERROR(Status) || !Root) {
        Print(L"[NOVA] Avertissement: OpenVolume a echoue (%r)\n", Status);
        return Status;
    }

    // Ouverture de EFI\NOVA\config.ini
    Status = Root->Open(Root, &ConfigFile, L"EFI\\NOVA\\config.ini", EFI_FILE_MODE_READ, 0);
    if (EFI_ERROR(Status)) {
        // Fallback sans EFI\ devant
        Status = Root->Open(Root, &ConfigFile, L"NOVA\\config.ini", EFI_FILE_MODE_READ, 0);
    }

    if (EFI_ERROR(Status) || !ConfigFile) {
        Print(L"[NOVA] Fichier EFI\\NOVA\\config.ini non trouve (%r). Valeurs par defaut appliquees.\n", Status);
        Root->Close(Root);
        return Status;
    }

    char *buf = AllocatePool(INI_BUF_SIZE);
    if (!buf) {
        ConfigFile->Close(ConfigFile);
        Root->Close(Root);
        return EFI_OUT_OF_RESOURCES;
    }

    UINTN readSize = INI_BUF_SIZE - 1;
    Status = ConfigFile->Read(ConfigFile, &readSize, buf);
    if (!EFI_ERROR(Status)) {
        buf[readSize] = '\0';
        ParseConfigIni(buf, readSize);
    }

    FreePool(buf);
    ConfigFile->Close(ConfigFile);
    Root->Close(Root);
    return Status;
}

/**
 * Scan de tous les disques et partitions UEFI pour trouver les payloads
 */
static void ScanForTargets(void) {
    EFI_STATUS Status;
    UINTN HandleCount = 0;
    EFI_HANDLE *Handles = NULL;

    Print(L"[NOVA] Scan des partitions UEFI sur le bus...\n");

    Status = BS->LocateHandleBuffer(
        ByProtocol,
        &gEfiSimpleFileSystemProtocolGuid,
        NULL,
        &HandleCount,
        &Handles
    );

    if (EFI_ERROR(Status) || HandleCount == 0) {
        Print(L"[NOVA] Erreur: Aucune partition UEFI FAT32 detectee (%r).\n", Status);
        return;
    }

    Print(L"[NOVA] %d volumes SimpleFileSystem detectes.\n", HandleCount);

    for (UINTN i = 0; i < HandleCount; i++) {
        EFI_SIMPLE_FILE_SYSTEM_PROTOCOL *Fs = NULL;
        EFI_FILE_PROTOCOL *Root = NULL;

        Status = BS->HandleProtocol(Handles[i], &gEfiSimpleFileSystemProtocolGuid, (void**)&Fs);
        if (EFI_ERROR(Status) || !Fs) continue;

        Status = Fs->OpenVolume(Fs, &Root);
        if (EFI_ERROR(Status) || !Root) continue;

        // Verification de chaque cible
        for (UINTN t = 0; t < TargetCount; t++) {
            EFI_FILE_PROTOCOL *TargetFile = NULL;
            Status = Root->Open(Root, &TargetFile, Targets[t].FilePath, EFI_FILE_MODE_READ, 0);
            if (!EFI_ERROR(Status) && TargetFile) {
                Targets[t].Available = TRUE;
                Targets[t].DeviceHandle = Handles[i];
                TargetFile->Close(TargetFile);
                Print(L"[NOVA] Cible trouvee : '%s' (%s) sur Handle %p\n",
                    Targets[t].Name, Targets[t].FilePath, Handles[i]);
            }
        }

        Root->Close(Root);
    }

    if (Handles) {
        FreePool(Handles);
    }
}

/**
 * Initialisation graphique GOP
 */
static EFI_STATUS InitGOP(void) {
    EFI_STATUS Status = BS->LocateProtocol(&gEfiGraphicsOutputProtocolGuid, NULL, (void**)&Gop);
    if (EFI_ERROR(Status) || !Gop) {
        return Status;
    }

    ScreenWidth = Gop->Mode->Info->HorizontalResolution;
    ScreenHeight = Gop->Mode->Info->VerticalResolution;

    BackBuffer = AllocatePool(ScreenWidth * ScreenHeight * sizeof(EFI_GRAPHICS_OUTPUT_BLT_PIXEL));
    return EFI_SUCCESS;
}

static void ClearScreen(UINT32 ColorHex) {
    if (!BackBuffer) return;
    EFI_GRAPHICS_OUTPUT_BLT_PIXEL Pixel;
    Pixel.Red   = (ColorHex >> 16) & 0xFF;
    Pixel.Green = (ColorHex >> 8)  & 0xFF;
    Pixel.Blue  = ColorHex & 0xFF;
    Pixel.Reserved = 0;

    for (UINTN i = 0; i < ScreenWidth * ScreenHeight; i++) {
        BackBuffer[i] = Pixel;
    }
}

static void DrawRect(INT32 x, INT32 y, INT32 w, INT32 h, UINT32 ColorHex) {
    if (!BackBuffer) return;
    EFI_GRAPHICS_OUTPUT_BLT_PIXEL Pixel;
    Pixel.Red   = (ColorHex >> 16) & 0xFF;
    Pixel.Green = (ColorHex >> 8)  & 0xFF;
    Pixel.Blue  = ColorHex & 0xFF;
    Pixel.Reserved = 0;

    for (INT32 py = y; py < y + h; py++) {
        if (py < 0 || py >= (INT32)ScreenHeight) continue;
        for (INT32 px = x; px < x + w; px++) {
            if (px < 0 || px >= (INT32)ScreenWidth) continue;
            BackBuffer[py * ScreenWidth + px] = Pixel;
        }
    }
}

static void DrawChar(INT32 x, INT32 y, char c, UINT32 ColorHex, INT32 Scale) {
    if (!BackBuffer || c < 0 || c > 127) return;
    const unsigned char *glyph = font8x8_basic[(int)c];

    for (int row = 0; row < 8; row++) {
        for (int col = 0; col < 8; col++) {
            if (glyph[row] & (1 << col)) {
                DrawRect(x + col * Scale, y + row * Scale, Scale, Scale, ColorHex);
            }
        }
    }
}

static void DrawString(INT32 x, INT32 y, const CHAR16 *str, UINT32 ColorHex, INT32 Scale) {
    if (!str) return;
    INT32 cx = x;
    while (*str) {
        char ascii = (*str < 128) ? (char)*str : '?';
        DrawChar(cx, y, ascii, ColorHex, Scale);
        cx += 8 * Scale;
        str++;
    }
}

static void FlushBuffer(void) {
    if (!Gop || !BackBuffer) return;
    Gop->Blt(
        Gop,
        BackBuffer,
        EfiBltBufferToVideo,
        0, 0,
        0, 0,
        ScreenWidth, ScreenHeight,
        ScreenWidth * sizeof(EFI_GRAPHICS_OUTPUT_BLT_PIXEL)
    );
}

/**
 * Dessine l'interface utilisateur UEFI
 */
static void RenderUI(void) {
    ClearScreen(COLOR_BG);

    // Barre d'en-tete
    DrawRect(0, 0, ScreenWidth, 60, COLOR_HEADER_BG);
    DrawRect(0, 59, ScreenWidth, 1, COLOR_BORDER_NORM);

    DrawRect(30, 22, 16, 16, COLOR_ACCENT);
    DrawString(60, 20, ManagerTitle, COLOR_TEXT_WHITE, 2);

    CHAR16 ResStr[64];
    SPrint(ResStr, sizeof(ResStr), L"%dx%d@100Hz DirectGOP", ScreenWidth, ScreenHeight);
    DrawString(ScreenWidth - 320, 24, ResStr, COLOR_TEXT_MUTED, 1);

    // Sous-titre
    DrawString(ScreenWidth / 2 - 240, 100, L"Selecteur d'Amorcage UEFI Multi-Disques", COLOR_TEXT_WHITE, 2);
    DrawString(ScreenWidth / 2 - 210, 130, L"LDLC F7 (NVMe) & KXG6A (NVMe)", COLOR_TEXT_MUTED, 1);

    // Cartes des systemes
    INT32 cardW = 380;
    INT32 cardH = 220;
    INT32 gap = 60;
    INT32 startX = (ScreenWidth - (TargetCount * cardW + (TargetCount - 1) * gap)) / 2;
    INT32 cardY = ScreenHeight / 2 - 90;

    for (UINTN i = 0; i < TargetCount; i++) {
        INT32 cx = startX + i * (cardW + gap);
        BOOLEAN isSel = (i == SelectedIndex);

        // Fond de carte
        DrawRect(cx, cardY, cardW, cardH, isSel ? COLOR_CARD_SELECT : COLOR_CARD_NORMAL);
        DrawRect(cx, cardY, cardW, 2, isSel ? COLOR_BORDER_SEL : COLOR_BORDER_NORM);
        DrawRect(cx, cardY + cardH - 2, cardW, 2, isSel ? COLOR_BORDER_SEL : COLOR_BORDER_NORM);
        DrawRect(cx, cardY, 2, cardH, isSel ? COLOR_BORDER_SEL : COLOR_BORDER_NORM);
        DrawRect(cx + cardW - 2, cardY, 2, cardH, isSel ? COLOR_BORDER_SEL : COLOR_BORDER_NORM);

        // Logo icone simple
        if (i == 0) { // macOS
            DrawRect(cx + cardW / 2 - 24, cardY + 25, 48, 48, 0x1E293B);
            DrawRect(cx + cardW / 2 - 12, cardY + 37, 24, 24, COLOR_APPLE_BLUE);
        } else { // Windows Boot Manager
            DrawRect(cx + cardW / 2 - 24, cardY + 25, 48, 48, 0x1E293B);
            DrawRect(cx + cardW / 2 - 16, cardY + 33, 14, 14, COLOR_WIN_AZURE);
            DrawRect(cx + cardW / 2 + 2,  cardY + 33, 14, 14, COLOR_WIN_AZURE);
            DrawRect(cx + cardW / 2 - 16, cardY + 51, 14, 14, COLOR_WIN_AZURE);
            DrawRect(cx + cardW / 2 + 2,  cardY + 51, 14, 14, COLOR_WIN_AZURE);
        }

        // Titre & Sous-titre
        INT32 titleLen = StrLen(Targets[i].Name);
        DrawString(cx + (cardW - titleLen * 16) / 2, cardY + 95, Targets[i].Name, COLOR_TEXT_WHITE, 2);
        
        INT32 subLen = StrLen(Targets[i].Subtitle);
        DrawString(cx + (cardW - subLen * 8) / 2, cardY + 125, Targets[i].Subtitle, COLOR_TEXT_MUTED, 1);

        // Disque
        INT32 diskLen = StrLen(Targets[i].DiskHint);
        DrawString(cx + (cardW - diskLen * 8) / 2, cardY + 150, Targets[i].DiskHint, COLOR_TEXT_MUTED, 1);

        // Statut Disponible
        if (Targets[i].Available) {
            DrawString(cx + cardW / 2 - 50, cardY + 180, L"[ Pret a demarrer ]", 0x4ADE80, 1);
        } else {
            DrawString(cx + cardW / 2 - 50, cardY + 180, L"[ Non detecte ]", 0xF87171, 1);
        }

        if (isSel) {
            DrawString(cx + cardW / 2 - 8, cardY + cardH + 12, L"^", COLOR_ACCENT, 2);
        }
    }

    // Pied de page / Instructions clavier
    DrawRect(0, ScreenHeight - 50, ScreenWidth, 50, COLOR_HEADER_BG);
    DrawRect(0, ScreenHeight - 51, ScreenWidth, 1, COLOR_BORDER_NORM);

    DrawString(50, ScreenHeight - 32,
        L"[<- / ->] Changer de cible   |   [Entree] Demarrer   |   [Echap] Quitter vers UEFI",
        COLOR_TEXT_WHITE, 1);

    if (BootTimeout <= 0) {
        DrawString(ScreenWidth - 360, ScreenHeight - 32,
            L"Attente indefinie (Choix utilisateur)", COLOR_ACCENT, 1);
    } else {
        CHAR16 TimeStr[64];
        SPrint(TimeStr, sizeof(TimeStr), L"Auto-boot dans %d s...", BootTimeout);
        DrawString(ScreenWidth - 260, ScreenHeight - 32, TimeStr, COLOR_ACCENT, 1);
    }

    FlushBuffer();
}

/**
 * Lance l'execution du payload UEFI selectionne
 */
static EFI_STATUS BootSelected(EFI_HANDLE ImageHandle, UINTN TargetIdx) {
    if (TargetIdx >= TargetCount || !Targets[TargetIdx].Available || !Targets[TargetIdx].DeviceHandle) {
        Print(L"[NOVA] Erreur : La cible '%s' n'est pas disponible sur le disque physique.\n", Targets[TargetIdx].Name);
        BS->Stall(2000000);
        return EFI_NOT_FOUND;
    }

    Print(L"[NOVA] Demarrage de : %s\n", Targets[TargetIdx].Name);
    Print(L"[NOVA] Fichier      : %s\n", Targets[TargetIdx].FilePath);
    Print(L"[NOVA] Disque       : %s\n", Targets[TargetIdx].DiskHint);

    EFI_DEVICE_PATH_PROTOCOL *FilePath = FileDevicePath(Targets[TargetIdx].DeviceHandle, Targets[TargetIdx].FilePath);
    if (!FilePath) {
        Print(L"[NOVA] Erreur : FileDevicePath a echoue.\n");
        BS->Stall(2000000);
        return EFI_OUT_OF_RESOURCES;
    }

    EFI_HANDLE TargetImage = NULL;
    EFI_STATUS Status = BS->LoadImage(
        FALSE,
        ImageHandle,
        FilePath,
        NULL,
        0,
        &TargetImage
    );

    if (EFI_ERROR(Status)) {
        Print(L"[NOVA] Erreur lors de LoadImage (%r)\n", Status);
        BS->Stall(2500000);
        return Status;
    }

    Print(L"[NOVA] Image chargee avec succes (Handle %p). Transfert du controle...\n", TargetImage);
    Status = BS->StartImage(TargetImage, NULL, NULL);

    Print(L"[NOVA] Le payload a retourne l'etat : %r\n", Status);
    BS->Stall(2000000);
    return Status;
}

/**
 * Point d'entree EFI principal
 */
EFI_STATUS EFIAPI efi_main(EFI_HANDLE ImageHandle, EFI_SYSTEM_TABLE *SystemTable) {
    InitializeLib(ImageHandle, SystemTable);

    // Initialisation
    InitDefaultTargets();

    Print(L"====================================================\n");
    Print(L" NOVA UEFI x64 Boot Manager - Release 1.0\n");
    Print(L" Support dual-boot : macOS (LDLC F7) & Windows (KXG6A)\n");
    Print(L"====================================================\n");

    // 1. Lecture reelle de EFI/NOVA/config.ini
    LoadConfigFromDisk(ImageHandle);

    // 2. Scan reel des volumes UEFI
    ScanForTargets();

    // 3. Initialisation graphique
    EFI_STATUS Status = InitGOP();
    if (EFI_ERROR(Status)) {
        Print(L"[NOVA] GOP non disponible (%r). Mode texte uniquement.\n", Status);
    }

    // 4. Boucle principale du selecteur
    // Timeout = 0 : Laisse le picker affiche jusqu'au choix utilisateur sans compte a rebours
    BOOLEAN Running = TRUE;

    while (Running) {
        if (Gop && BackBuffer) {
            RenderUI();
        } else {
            // Mode console fallback
            ST->ConOut->ClearScreen(ST->ConOut);
            Print(L"\n *** %s ***\n", ManagerTitle);
            Print(L" 0. %s - %s [%s]\n", Targets[0].Name, Targets[0].Subtitle, Targets[0].Available ? L"DISPONIBLE" : L"ABSENT");
            Print(L" 1. %s - %s [%s]\n", Targets[1].Name, Targets[1].Subtitle, Targets[1].Available ? L"DISPONIBLE" : L"ABSENT");
            Print(L" Selection active : [%d] %s\n", (int)SelectedIndex, Targets[SelectedIndex].Name);
            Print(L" [<-/->] Choix   [Entree] Boot   [Echap] Quitter\n");
        }

        EFI_INPUT_KEY Key;
        UINTN EventIndex;
        BS->WaitForEvent(1, &ST->ConIn->WaitForKey, &EventIndex);
        Status = ST->ConIn->ReadKeyStroke(ST->ConIn, &Key);

        if (!EFI_ERROR(Status)) {
            if (Key.ScanCode == SCAN_LEFT || Key.ScanCode == SCAN_UP) {
                if (SelectedIndex > 0) SelectedIndex--;
                else SelectedIndex = TargetCount - 1;
            } else if (Key.ScanCode == SCAN_RIGHT || Key.ScanCode == SCAN_DOWN) {
                SelectedIndex = (SelectedIndex + 1) % TargetCount;
            } else if (Key.ScanCode == SCAN_ESC) {
                Print(L"[NOVA] Sortie du gestionnaire demandee.\n");
                Running = FALSE;
            } else if (Key.UnicodeChar == CHAR_CARRIAGE_RETURN || Key.UnicodeChar == L' ' || Key.UnicodeChar == L'\n') {
                BootSelected(ImageHandle, SelectedIndex);
            } else if (Key.UnicodeChar == L'0' || Key.UnicodeChar == L'1') {
                SelectedIndex = (Key.UnicodeChar - L'0');
                BootSelected(ImageHandle, SelectedIndex);
            }
        }
    }

    if (BackBuffer) {
        FreePool(BackBuffer);
    }

    return EFI_SUCCESS;
}
