' Shark Browser Launcher - CMD window hidden
Dim objShell, strDir
Set objShell = CreateObject("WScript.Shell")
strDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
objShell.CurrentDirectory = strDir

' First time: check node_modules
Dim objFSO
Set objFSO = CreateObject("Scripting.FileSystemObject")
If Not objFSO.FolderExists(strDir & "\node_modules") Then
  ' Show CMD only for first-time setup
  objShell.Run "cmd /c npm install & echo Done! & timeout /t 2", 1, True
End If

' Launch Electron with no CMD window (0 = hidden)
objShell.Run "cmd /c npm start", 0, False
