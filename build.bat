@ECHO OFF
title Build Music Player

echo Setting Visual Studio variables...
call "%VS120COMNTOOLS%vsvars32.bat"

echo Settings build variables...
set MP_ReleaseDir="H:\Projects\Bin\Release"

mkdir %MP_ReleaseDir%

set MP_7ZipDir="C:\Program Files\7-Zip"
set MP_NodeJSDir="C:\Program Files\nodejs"

set MP_WebDir="H:\Projects\MusicPlayer"
set MP_ProjectDir="H:\Projects\andrezammit.visualstudio.com\MusicPlayer"

set MP_CEFDir="%MP_ProjectDir%\CEF"
set MP_LauncherDir="%MP_ProjectDir%\Launcher"
set MP_DependsDir="%MP_ProjectDir%\Dependencies"

echo Building MusicPlayer app...
call msbuild %MP_CEFDir%\cefsimple.vcxproj /p:Configuration=Release

echo Copying dependencies...
call robocopy %MP_DependsDir% %MP_ReleaseDir% *.* /E

echo Copying Client...
call robocopy %MP_WebDir%\Client %MP_ReleaseDir%\Client *.* /E

echo Copying Server...
call robocopy %MP_WebDir%\Server %MP_ReleaseDir%\Server *.* /E

echo Copying node.js binary...
call robocopy %MP_NodeJSDir% %MP_ReleaseDir%\Server node.exe /E

echo Copying Version file...
call robocopy %MP_WebDir% %MP_ReleaseDir%\Client Version.txt

echo Creating MusicPlayer archive...
call %MP_7ZipDir%\7z a -r -x!*.pdb -x!.git %MP_ReleaseDir%\MusicPlayer.zip %MP_ReleaseDir%\*.*
call %MP_7ZipDir%\7z d %MP_ReleaseDir%\MusicPlayer.zip lib

echo Building MusicPlayer launcher...
call msbuild %MP_LauncherDir%\Launcher.vcxproj /p:Configuration=Release

echo Done.